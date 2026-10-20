import { parseArgvStrict, DRY_ALIASES, HELP_ALIASES } from './argv-guard.mjs';

/** Validate the complete command before deployment code can perform operational IO. */
export function parseDeployArgv(argv, { name, boolFlags = [], valueFlags = [], modes = [], exclusive = [] } = {}) {
  const parsed = parseArgvStrict({ argv, name, boolFlags: [...boolFlags, ...HELP_ALIASES], valueFlags });
  const seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    const eq = token.indexOf('=');
    const flag = eq > 0 ? token.slice(0, eq) : token;
    if (![...boolFlags, ...valueFlags, ...DRY_ALIASES, ...HELP_ALIASES].includes(flag)) throw new Error(`${name}: unknown argument ${token}`);
    if (seen.has(flag)) throw new Error(`${name}: duplicate argument ${flag}`);
    seen.add(flag);
    if (valueFlags.includes(flag)) {
      const value = eq > 0 ? token.slice(eq + 1) : argv[++i];
      if (!value || value.startsWith('-')) throw new Error(`${name}: ${flag} requires a value`);
    } else if (eq > 0) throw new Error(`${name}: ${flag} does not accept a value`);
  }
  for (const group of [modes, ...exclusive]) {
    if (group.filter(flag => seen.has(flag)).length > 1) throw new Error(`${name}: conflicting modes ${group.join(' | ')}`);
  }
  return { ...parsed, help: HELP_ALIASES.some(flag => seen.has(flag)) };
}

/**
 * Validate-only admission for outward commands whose preview is itself useful
 * (it reads recipients or state). Unknown, duplicate or malformed input exits 2
 * and help exits 0 before any IO; every dry alias reaches the caller as `dry`, so
 * `--dry` can never fall through to a real send.
 */
export function admitCommand(options, argv = process.argv.slice(2)) {
  let parsed;
  try { parsed = parseDeployArgv(argv, options); }
  catch (error) { console.error(error.message); process.exit(2); }
  if (parsed.help) {
    console.log(`${options.name}\nUsage: ${options.usage}\nHelp: no operational reads, credentials, subprocesses, writes or network actions.`);
    process.exit(0);
  }
  return parsed;
}

export function admitDeployment(options) {
  let parsed;
  try { parsed = parseDeployArgv(process.argv.slice(2), options); }
  catch (error) { console.error(error.message); process.exit(2); }
  if (parsed.help || parsed.dry) {
    console.log(`${options.name}\nUsage: ${options.usage}\nHelp/preview: no operational reads, credentials, subprocesses, writes or network actions.`);
    process.exit(0);
  }
  return parsed;
}
