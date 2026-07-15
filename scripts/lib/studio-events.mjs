import fs from 'fs';
import path from 'path';

export function eventsPath(root) {
  return path.join(root, 'portfolio', 'events.ndjson');
}

/**
 * Parse the ledger line-by-line, isolating damage to the line that carries it.
 *
 * The previous reader wrapped a whole-file `.map(JSON.parse)` in one try/catch
 * returning `[]`, so a SINGLE malformed line silently zeroed the entire ledger.
 * That is exactly what happened: a glued record at line 892 (committed
 * 2026-07-02, cf9a7a5d2) made all 892 events invisible to every consumer for
 * 13 days, unnoticed because generate-heartbeat prefers the sibling studio-ops
 * copy and quietly fell back to it — a working parallel path masking a dead sink.
 *
 * Malformed lines are skipped, never silently: they are returned so callers and
 * the check-ndjson-integrity gate can surface them. A partial read beats a
 * fabricated zero, but a partial read must never look like a clean one.
 *
 * @returns {{ events: object[], malformed: {line:number, reason:string, preview:string}[], total:number }}
 */
export function readEventsDetailed(root) {
  const filePath = eventsPath(root);
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    // Genuinely absent ledger — an honest empty, distinct from a corrupt one.
    return { events: [], malformed: [], total: 0 };
  }
  const events = [];
  const malformed = [];
  const lines = raw.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!line.trim()) return; // blank lines are padding, not records
    try {
      const parsed = JSON.parse(line);
      events.push(parsed);
    } catch (err) {
      malformed.push({
        line: index + 1,
        reason: err.message.slice(0, 120),
        preview: line.slice(0, 100),
      });
    }
  });
  return { events, malformed, total: events.length + malformed.length };
}

export function readEvents(root) {
  return readEventsDetailed(root).events;
}

/**
 * Append one event, guaranteeing it starts on its own line.
 *
 * Writing `${json}\n` is only newline-safe if every prior writer did the same.
 * Any producer that appended without a trailing newline (a mirror copy, a hand
 * edit, a truncated write) silently glues the next record onto the last one.
 * We cannot control every producer, so we verify rather than assume: if the
 * file does not already end in a newline, open one before writing.
 */
export function appendEvent(root, event) {
  const filePath = eventsPath(root);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const payload = {
    ts: new Date().toISOString(),
    schemaVersion: '1.0',
    ...event
  };
  let prefix = '';
  try {
    const { size } = fs.statSync(filePath);
    if (size > 0) {
      const fd = fs.openSync(filePath, 'r');
      const tail = Buffer.alloc(1);
      fs.readSync(fd, tail, 0, 1, size - 1);
      fs.closeSync(fd);
      if (tail.toString('utf8') !== '\n') prefix = '\n';
    }
  } catch {
    // No file yet (or unreadable tail) — appendFileSync creates it; no prefix needed.
  }
  fs.appendFileSync(filePath, `${prefix}${JSON.stringify(payload)}\n`);
  return payload;
}

export function latestEvents(root, days = 30) {
  const cutoff = Date.now() - days * 86400_000;
  return readEvents(root).filter((event) => {
    const ts = new Date(event.ts || 0).getTime();
    return Number.isFinite(ts) && ts >= cutoff;
  });
}
