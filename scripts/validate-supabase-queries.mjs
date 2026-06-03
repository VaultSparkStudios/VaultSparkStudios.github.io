#!/usr/bin/env node
/**
 * validate-supabase-queries.mjs — Static validator for client-side Supabase queries
 *
 * Scans assets/ and vault-member/ for .from('table').select/.eq/.order/.neq/.lt/.gt/.in/.is calls
 * and cross-references table + column names against scripts/lib/supabase-schema-contracts.json.
 *
 * Designed to catch the schema-drift class of bug that surfaced in S101
 * (subscription_status -> is_sparked, rank_title -> points, user_id -> member_id).
 *
 * Unknown tables WARN (skipped from column validation so the contract file
 * stays the single source of truth for what is strictly validated).
 * Unknown columns on known tables ERROR.
 * Alias-trap hits (historical column names from S101 drift) ERROR with explicit remediation.
 *
 * Usage:
 *   node scripts/validate-supabase-queries.mjs           (print report)
 *   node scripts/validate-supabase-queries.mjs --check   (exit 1 if any ERROR)
 *   node scripts/validate-supabase-queries.mjs --relaxed (demote UNKNOWN_COLUMN to WARN)
 *   node scripts/validate-supabase-queries.mjs --json    (machine-readable output)
 *
 * Default severity:
 *   ALIAS_TRAP         → ERROR  (S101 drift regression — always hard-fail)
 *   UNKNOWN_COLUMN     → ERROR  (default ratchet after S106; use --relaxed to opt out
 *                                while backfilling a just-added dashboard column)
 *   UNKNOWN_TABLE      → WARN   (table not in contract — not validated)
 *
 * Exit code 0 = clean. Non-zero in --check = errors found.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const argv = process.argv.slice(2);
const checkMode = argv.includes('--check');
const jsonMode = argv.includes('--json');
const strictMode = !argv.includes('--relaxed');
const selfTest = argv.includes('--self-test');

const SCAN_DIRS = ['assets', 'vault-member'];
const CONTRACT_PATH = path.join(root, 'scripts/lib/supabase-schema-contracts.json');

function loadContracts() {
  if (!fs.existsSync(CONTRACT_PATH)) {
    console.error(`✗ Missing contract: ${CONTRACT_PATH}`);
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && /\.(js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function stripBlockComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function lineOf(src, idx) {
  let n = 1;
  for (let i = 0; i < idx && i < src.length; i++) if (src[i] === '\n') n++;
  return n;
}

/**
 * Parse one file into a list of Supabase query uses.
 * Each use: { table, columns:[{name,kind,lineno}], lineno, raw }
 *  - .from('t')                       → sets table for the chain
 *  - .select('a,b,c')                 → kind: 'select' columns
 *  - .eq/.neq/.lt/.lte/.gt/.gte/.is/.in/.like/.ilike/.contains/.containedBy('col', ...)
 *                                     → kind: 'filter' single column
 *  - .order('col', ...)               → kind: 'order'
 *
 * We walk the file keyed by the anchor `.from('t')`, then scan the next ~2kb
 * for chained calls (chains may span multiple lines). A second `.from(` resets
 * the anchor. This is a heuristic, not a full JS parser — good enough for
 * the lint class we care about.
 */
/**
 * Extract top-level keys from an object literal starting just after its opening `{`.
 * Tracks brace/paren/bracket depth + strings + regex literals so nested objects and
 * function-call values don't contribute false keys. Only keys at depth 0 (inside the
 * outer object) are returned. Keys may be bare identifiers (`col:`) or quoted
 * (`'col':` / `"col":`).
 */
function extractTopLevelKeys(chain, startIdx) {
  const keys = [];
  let depth = 1;                // already inside the outer `{`
  let parenDepth = 0;
  let bracketDepth = 0;
  let i = startIdx;
  let atKeyPosition = true;     // we are at the start where a key can appear
  let inStr = null;             // string delimiter char if inside a string

  while (i < chain.length && depth > 0) {
    const ch = chain[i];

    if (inStr) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === inStr) inStr = null;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      // Quoted key at depth 0 when atKeyPosition
      if (depth === 1 && parenDepth === 0 && bracketDepth === 0 && atKeyPosition) {
        const end = findStringEnd(chain, i, ch);
        if (end > i) {
          const key = chain.slice(i + 1, end);
          // peek next non-whitespace for `:` confirming this is a key, not a value
          let k = end + 1;
          while (k < chain.length && /\s/.test(chain[k])) k++;
          if (chain[k] === ':') {
            if (/^\w+$/.test(key)) keys.push(key);
            atKeyPosition = false;
            i = k + 1;
            continue;
          }
        }
      }
      inStr = ch;
      i++;
      continue;
    }

    if (ch === '{') { depth++; atKeyPosition = false; i++; continue; }
    if (ch === '}') {
      depth--;
      if (depth === 0) break;
      atKeyPosition = true; // a closing brace at inner depth ends a value; next is key
      i++;
      continue;
    }
    if (ch === '(') { parenDepth++; i++; continue; }
    if (ch === ')') { parenDepth--; i++; continue; }
    if (ch === '[') { bracketDepth++; i++; continue; }
    if (ch === ']') { bracketDepth--; i++; continue; }
    if (ch === ',' && depth === 1 && parenDepth === 0 && bracketDepth === 0) {
      atKeyPosition = true;
      i++;
      continue;
    }

    // Bare identifier at depth 0 in key position
    if (depth === 1 && parenDepth === 0 && bracketDepth === 0 && atKeyPosition && /[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < chain.length && /[A-Za-z0-9_]/.test(chain[j])) j++;
      const ident = chain.slice(i, j);
      // peek next non-whitespace for `:`
      let k = j;
      while (k < chain.length && /\s/.test(chain[k])) k++;
      if (chain[k] === ':') {
        keys.push(ident);
        atKeyPosition = false;
        i = k + 1;
        continue;
      }
      // spread or shorthand — skip over identifier but stay at keyPosition false
      atKeyPosition = false;
      i = j;
      continue;
    }

    if (!/\s/.test(ch)) atKeyPosition = false;
    i++;
  }

  return keys;
}

function findStringEnd(s, startIdx, quote) {
  for (let i = startIdx + 1; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue; }
    if (s[i] === quote) return i;
  }
  return -1;
}

function parseSource(rawSrc, fileLabel) {
  const src = stripBlockComments(rawSrc);
  const uses = [];
  const FROM_RE = /\.from\(\s*['"`](\w+)['"`]\s*\)/g;
  const anchors = [];
  let m;
  while ((m = FROM_RE.exec(src))) anchors.push({ table: m[1], start: m.index + m[0].length, fromStart: m.index });

  for (let i = 0; i < anchors.length; i++) {
    const { table, start, fromStart } = anchors[i];
    const end = i + 1 < anchors.length ? anchors[i + 1].fromStart : Math.min(src.length, start + 2000);
    const chain = src.slice(start, end);
    const chainOffset = start;
    const use = {
      file: fileLabel,
      table,
      lineno: lineOf(src, fromStart),
      columns: [],
    };

    // .select('a,b,c')  — first arg must be a string literal of columns
    const SELECT_RE = /\.select\(\s*['"`]([^'"`]*)['"`]/g;
    let s;
    while ((s = SELECT_RE.exec(chain))) {
      const raw = s[1].trim();
      if (raw === '*' || raw === '' || raw === 'id') {
        // '*' is whole-row; 'id' is trivial — count but don't validate
        if (raw === 'id') use.columns.push({ name: 'id', kind: 'select', lineno: lineOf(src, chainOffset + s.index) });
        continue;
      }
      // Strip nested joins: "challenges(title, points)" — everything between balanced parens
      let stripped = raw;
      for (let safety = 0; safety < 8; safety++) {
        const next = stripped.replace(/\w+\s*\([^()]*\)/g, '');
        if (next === stripped) break;
        stripped = next;
      }
      const cols = stripped.split(',').map((c) => c.trim()).filter(Boolean);
      for (const col of cols) {
        if (col.includes('(') || col.includes(')')) continue; // leftover fragment — skip
        // strip aliasing: "username:public_username" → "public_username"
        const name = col.includes(':') ? col.split(':').pop().trim() : col;
        if (!/^\w+$/.test(name)) continue;
        use.columns.push({ name, kind: 'select', lineno: lineOf(src, chainOffset + s.index) });
      }
    }

    // .eq/.neq/.lt/.lte/.gt/.gte/.is/.like/.ilike/.contains/.containedBy/.in('col', ...)
    const FILTER_RE = /\.(eq|neq|lt|lte|gt|gte|is|like|ilike|contains|containedBy|in|match)\(\s*['"`](\w+)['"`]/g;
    let f;
    while ((f = FILTER_RE.exec(chain))) {
      use.columns.push({ name: f[2], kind: `filter:${f[1]}`, lineno: lineOf(src, chainOffset + f.index) });
    }

    // .order('col', ...)
    const ORDER_RE = /\.order\(\s*['"`](\w+)['"`]/g;
    let o;
    while ((o = ORDER_RE.exec(chain))) {
      use.columns.push({ name: o[1], kind: 'order', lineno: lineOf(src, chainOffset + o.index) });
    }

    // .insert({...}) / .update({...}) / .upsert({...}) — extract object-literal keys.
    // Handles both single object {col: val} and array of objects [{col: val}] (bulk insert).
    // Heuristic string-parser: finds the opening brace after the call, walks to the
    // balanced close brace, then extracts top-level keys (depth-0 commas only).
    const WRITE_RE = /\.(insert|update|upsert)\(\s*(\[\s*)?\{/g;
    let w;
    while ((w = WRITE_RE.exec(chain))) {
      const writeKind = w[1];
      const bodyStart = w.index + w[0].length; // position just after the '{'
      const keys = extractTopLevelKeys(chain, bodyStart);
      const lineno = lineOf(src, chainOffset + w.index);
      for (const name of keys) {
        use.columns.push({ name, kind: `write:${writeKind}`, lineno });
      }
    }

    uses.push(use);
  }
  return uses;
}

function parseFile(filePath) {
  return parseSource(
    fs.readFileSync(filePath, 'utf8'),
    path.relative(root, filePath).replace(/\\/g, '/')
  );
}

function validate(uses, contracts) {
  const tables = contracts.tables || {};
  const aliasTraps = contracts._alias_traps || {};
  const errors = [];
  const warnings = [];
  const unknownTables = new Set();

  for (const use of uses) {
    const spec = tables[use.table];
    if (!spec) {
      unknownTables.add(use.table);
      warnings.push({
        level: 'WARN',
        code: 'UNKNOWN_TABLE',
        file: use.file,
        lineno: use.lineno,
        table: use.table,
        message: `Table "${use.table}" is not in schema contracts — column validation skipped. Add it to scripts/lib/supabase-schema-contracts.json to enable strict checking.`,
      });
      continue;
    }
    const allowed = new Set(spec.columns);
    for (const col of use.columns) {
      const trapKey = `${use.table}.${col.name}`;
      if (aliasTraps[trapKey]) {
        errors.push({
          level: 'ERROR',
          code: 'ALIAS_TRAP',
          file: use.file,
          lineno: col.lineno,
          table: use.table,
          column: col.name,
          kind: col.kind,
          message: `Historical column "${use.table}.${col.name}" was renamed — use "${aliasTraps[trapKey]}" instead. (Context: S101 schema drift closeout.)`,
        });
        continue;
      }
      if (!allowed.has(col.name)) {
        const entry = {
          level: strictMode ? 'ERROR' : 'WARN',
          code: 'UNKNOWN_COLUMN',
          file: use.file,
          lineno: col.lineno,
          table: use.table,
          column: col.name,
          kind: col.kind,
          message: `Column "${use.table}.${col.name}" not in migration-sourced contract (may have been added via Supabase dashboard — verify + add to scripts/lib/supabase-schema-contracts.json, or remove if drift).`,
        };
        if (strictMode) errors.push(entry);
        else warnings.push(entry);
      }
    }
  }
  return { errors, warnings, unknownTables: [...unknownTables] };
}

function runSelfTest() {
  const contracts = {
    tables: {
      vault_members: { columns: ['id', 'username', 'points', 'is_sparked'] },
      challenge_submissions: { columns: ['id', 'challenge_id', 'member_id', 'created_at'] },
    },
    _alias_traps: {
      'vault_members.subscription_status': 'is_sparked',
      'vault_members.rank_title': 'points',
      'challenge_submissions.user_id': 'member_id',
    },
  };

  const cases = [
    {
      name: 'clean select matches contract',
      src: `VSPublic.from('vault_members').select('id, username').eq('is_sparked', true);`,
      expect: (r) => r.errors.length === 0 && r.warnings.length === 0,
    },
    {
      name: 'alias trap: subscription_status',
      src: `VSPublic.from('vault_members').eq('subscription_status', 'sparked');`,
      expect: (r) => r.errors.length === 1 && r.errors[0].code === 'ALIAS_TRAP'
        && r.errors[0].column === 'subscription_status',
    },
    {
      name: 'alias trap: rank_title in select',
      src: `VSPublic.from('vault_members').select('id,rank_title').get();`,
      expect: (r) => r.errors.some((e) => e.code === 'ALIAS_TRAP' && e.column === 'rank_title'),
    },
    {
      name: 'alias trap: challenge_submissions.user_id',
      src: `VSSupabase.from('challenge_submissions').eq('user_id', uid);`,
      expect: (r) => r.errors.some((e) => e.code === 'ALIAS_TRAP' && e.column === 'user_id'),
    },
    {
      name: 'unknown column is ERROR by default',
      src: `VSPublic.from('vault_members').select('not_a_real_column');`,
      expect: (r) => r.errors.some((e) => e.code === 'UNKNOWN_COLUMN'),
    },
    {
      name: 'unknown table is WARN, column validation skipped',
      src: `VSPublic.from('nonexistent_table').select('whatever').eq('anything', 1);`,
      expect: (r) => r.errors.length === 0 && r.warnings.some((w) => w.code === 'UNKNOWN_TABLE'),
    },
    {
      name: 'nested join syntax does not leak trailing ")"',
      src: `VSSupabase.from('challenge_submissions').select('challenge_id, created_at, challenges(title, points)');`,
      expect: (r) => r.errors.length === 0
        && !r.warnings.some((w) => /points\)/.test(w.column || '')),
    },
    {
      name: 'alias-stripped column resolves to base',
      src: `VSPublic.from('vault_members').select('handle:username, score:points');`,
      expect: (r) => r.errors.length === 0 && r.warnings.length === 0,
    },
    {
      name: 'insert with alias_trap column fires ALIAS_TRAP',
      src: `VSSupabase.from('vault_members').insert({ id: uid, subscription_status: 'sparked' });`,
      expect: (r) => r.errors.some((e) => e.code === 'ALIAS_TRAP' && e.column === 'subscription_status' && e.kind === 'write:insert'),
    },
    {
      name: 'update with renamed column fires ALIAS_TRAP',
      src: `VSSupabase.from('challenge_submissions').update({ user_id: uid }).eq('id', 1);`,
      expect: (r) => r.errors.some((e) => e.code === 'ALIAS_TRAP' && e.column === 'user_id' && e.kind === 'write:update'),
    },
    {
      name: 'upsert with quoted keys extracts correctly',
      src: `VSSupabase.from('vault_members').upsert({ 'id': uid, "points": 100 });`,
      expect: (r) => r.errors.length === 0 && r.warnings.length === 0,
    },
    {
      name: 'insert with nested object value does not leak inner keys',
      src: `VSSupabase.from('vault_members').insert({ id: uid, metadata: { subscription_status: 'ignore-me' } });`,
      expect: (r) => !r.errors.some((e) => e.code === 'ALIAS_TRAP'),
    },
    {
      name: 'insert unknown column on known table is ERROR by default',
      src: `VSSupabase.from('vault_members').insert({ id: uid, not_a_real_col: 1 });`,
      expect: (r) => r.errors.some((e) => e.code === 'UNKNOWN_COLUMN' && e.column === 'not_a_real_col'),
    },
    {
      name: 'bulk insert array extracts keys from first object',
      src: `VSSupabase.from('vault_members').insert([{ id: uid, points: 10 }]);`,
      expect: (r) => r.errors.length === 0 && r.warnings.length === 0,
    },
  ];

  let pass = 0, fail = 0;
  for (const c of cases) {
    const uses = parseSource(c.src, 'self-test://' + c.name);
    const result = validate(uses, contracts);
    if (c.expect(result)) { pass++; console.log(`  ✓ ${c.name}`); }
    else {
      fail++;
      console.log(`  ✗ ${c.name}`);
      console.log(`     errors:   ${JSON.stringify(result.errors.map((e) => e.code + ':' + e.column))}`);
      console.log(`     warnings: ${JSON.stringify(result.warnings.map((w) => w.code + ':' + (w.column || w.table)))}`);
    }
  }
  console.log(`\nself-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

function main() {
  if (selfTest) return runSelfTest();
  const contracts = loadContracts();
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(root, d)));
  const allUses = [];
  for (const f of files) allUses.push(...parseFile(f));
  const result = validate(allUses, contracts);

  if (jsonMode) {
    console.log(JSON.stringify({
      scanned: files.length,
      uses: allUses.length,
      errors: result.errors,
      warnings: result.warnings,
      unknownTables: result.unknownTables,
    }, null, 2));
    process.exit(result.errors.length ? 1 : 0);
  }

  console.log(`validate-supabase-queries · scanned ${files.length} files · ${allUses.length} query chains`);
  if (!result.errors.length && !result.warnings.length) {
    console.log('  ✓ clean — all query columns match schema contracts');
    process.exit(0);
  }

  for (const e of result.errors) {
    console.log(`  ✗ ${e.code}  ${e.file}:${e.lineno}  ${e.message}`);
  }

  const colWarns = result.warnings.filter((w) => w.code === 'UNKNOWN_COLUMN');
  const tableWarns = result.warnings.filter((w) => w.code === 'UNKNOWN_TABLE');

  if (colWarns.length) {
    console.log('');
    console.log(`  ⚠ ${colWarns.length} unknown column(s) — verify against live schema or add to contract:`);
    const byTable = new Map();
    for (const w of colWarns) {
      if (!byTable.has(w.table)) byTable.set(w.table, new Set());
      byTable.get(w.table).add(w.column);
    }
    for (const [t, cols] of byTable) {
      console.log(`     - ${t}: ${[...cols].join(', ')}`);
    }
  }

  if (tableWarns.length) {
    const byTable = new Map();
    for (const w of tableWarns) {
      if (!byTable.has(w.table)) byTable.set(w.table, []);
      byTable.get(w.table).push(`${w.file}:${w.lineno}`);
    }
    console.log('');
    console.log(`  ⚠ ${tableWarns.length} unknown table call(s) — not in contract, skipped:`);
    for (const [t, hits] of byTable) {
      console.log(`     - ${t}  (${hits.length} call${hits.length === 1 ? '' : 's'})`);
    }
  }

  console.log('');
  console.log(`  Summary: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
  if (result.errors.length && checkMode) {
    process.exit(1);
  }
  process.exit(0);
}

main();
