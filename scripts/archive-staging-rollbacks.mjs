#!/usr/bin/env node
/** Preserve all rollback bytes; bound system-disk history to the newest 3 settled snapshots.
 * Production CLI is host-local Linux only, fixed to the website root and mounted archive volume.
 * Deploy producers and this utility share /var/lock/website-staging-rollback.lock.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';

export const ROOT = '/opt/studio/staging/website/.rollback';
export const VOLUME = '/mnt/HC_Volume_106991932';
export const VOLUME_UUID = 'b762538c-0c3a-4000-9cd8-5cd4bc91b578';
export const ARCHIVE = `${VOLUME}/studio-archives/website-staging/rollback`;
export const LOCK = '/var/lock/website-staging-rollback.lock';
export const KEEP = 3;
export const NAME = /^(?:desk-)?\d{14}$/;
export const LOCK_COMMANDS = ['exec 9>/var/lock/website-staging-rollback.lock', 'flock -x 9'];
export const HOST_ARCHIVER = '/opt/vaultspark-maintenance/archive-staging-rollbacks.mjs';
// Preflight holds fd9 through the producer's complete remote transaction. The
// internal child is already under that same lock and must not acquire it again.
export const ROLLBACK_PREFLIGHT = `if [ "$ROOT" = "/opt/studio/staging/website" ]; then ${LOCK_COMMANDS.join('; ')}; mkdir -p "$ROOT/.rollback"; node ${HOST_ARCHIVER} --locked; fi`;
export const ROLLBACK_ARCHIVE = `if [ "$ROOT" = "/opt/studio/staging/website" ]; then node ${HOST_ARCHIVER} --apply --locked; fi`;

function checked(command, args) {
  const r = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, timeout: 60 * 60_000, maxBuffer: 8 * 1024 * 1024 });
  if (r.status !== 0 || r.error) throw Error(`${command} failed (${r.status ?? r.error?.code}): ${(r.stderr ?? '').slice(0, 300)}`);
  return String(r.stdout ?? '');
}
function noSymlinkParents(target) {
  let part = path.parse(path.resolve(target)).root;
  for (const segment of path.resolve(target).slice(part.length).split(path.sep).filter(Boolean)) {
    part = path.join(part, segment);
    if (fs.lstatSync(part, { throwIfNoEntry: false })?.isSymbolicLink()) throw Error(`Symlink parent refused: ${part}`);
  }
}
export function planSnapshots(entries, { keep = KEEP, now = Date.now(), settledMs = 3600_000 } = {}) {
  if (!Number.isInteger(keep) || keep < KEEP) throw Error('At least three local snapshots required');
  const dirs = entries.filter(e => e.kind === 'directory' && NAME.test(e.name)).sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));
  const preserved = dirs.slice(0, keep).map(e => e.name);
  const candidates = dirs.slice(keep).filter(e => now - e.mtimeMs >= settledMs).sort((a,b)=>a.mtimeMs-b.mtimeMs).map(e=>e.name);
  return { preserved, candidates, ignored: entries.filter(e => !NAME.test(e.name) || e.kind !== 'directory').map(e => e.name) };
}
async function fileHash(file) {
  const hash = crypto.createHash('sha256');
  for await (const bytes of fs.createReadStream(file)) hash.update(bytes);
  return hash.digest('hex');
}
export async function manifest(root) {
  noSymlinkParents(root);
  // rsync -a preserves the metadata represented below. Refuse ACLs/xattrs,
  // including security labels, rather than silently lose unrepresented metadata.
  if(process.platform==='linux')checked('python3',['-c','import os,sys\nfor base,dirs,files in os.walk(sys.argv[1],followlinks=False):\n for name in [\".\"]+dirs+files:\n  p=os.path.join(base,name)\n  if os.listxattr(p,follow_symlinks=False): raise RuntimeError(\"extended metadata requires explicit archival support: \"+p)\n',root]);
  const rows = [];
  async function visit(relative) {
    const file = relative ? path.join(root, relative) : root;
    const s = fs.lstatSync(file, { bigint: true });
    if (s.isSymbolicLink() || (!s.isFile() && !s.isDirectory())) throw Error(`Unsupported snapshot entry: ${relative || '.'}`);
    if (s.isFile() && s.nlink !== 1n) throw Error(`Hard-linked snapshot entry refused: ${relative}`);
    const row = { path: relative || '.', type: s.isDirectory() ? 'directory' : 'file', mode: Number(s.mode & 0o7777n), uid: Number(s.uid), gid: Number(s.gid), mtimeNs: String(s.mtimeNs) };
    if (s.isFile()) { row.bytes = String(s.size); row.sha256 = await fileHash(file); }
    rows.push(row);
    if (s.isDirectory()) for (const name of fs.readdirSync(file).sort()) await visit(relative ? path.join(relative, name) : name);
  }
  await visit('');
  return { digest: crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'), entries: rows.length, fileBytes: rows.reduce((sum,r)=>sum+Number(r.bytes??0),0), rows };
}
function writeReceipt(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.tmp-${process.pid}`;
  const fd = fs.openSync(temp, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(data,null,2)+'\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temp,file);
  if(process.platform==='linux'){const dir=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}}
}
export function assertArchiveVolume({ volume = VOLUME, archive = ARCHIVE, root = ROOT, run = checked, stat = p=>fs.statSync(p) } = {}) {
  noSymlinkParents(root); noSymlinkParents(volume); noSymlinkParents(archive);
  if (path.resolve(archive) === path.resolve(volume) || !path.resolve(archive).startsWith(path.resolve(volume)+path.sep)) throw Error('Archive must be strictly beneath the named volume');
  const mounted = run('findmnt', ['-n', '-M', volume, '-o', 'TARGET']).trim();
  if (mounted !== volume) throw Error('Expected archive mount is unavailable');
  const volumeStat = stat(volume), rootStat = stat(root);
  if (volumeStat.dev === rootStat.dev) throw Error('Archive volume must differ from system disk');
  const uuid = run('findmnt', ['-n', '-M', volume, '-o', 'UUID']).trim();
  if (uuid !== VOLUME_UUID) throw Error('Archive filesystem identity mismatch');
  const identityFile = path.join(volume, 'studio-archives', '.website-rollback-volume.json');
  const identityStat=fs.lstatSync(identityFile,{throwIfNoEntry:false});
  if (identityStat?.isSymbolicLink()) throw Error('Archive identity file must not be a symlink');
  if (identityStat) {
    const expected = JSON.parse(fs.readFileSync(identityFile,'utf8'));
    if (expected.uuid !== uuid || expected.volume !== volume) throw Error('Archive volume identity mismatch');
  }
  return { uuid, volume, identityFile };
}

// Linux renameat2(RENAME_EXCHANGE) swaps a symlink and the old directory atomically:
// the original rollback path is never absent, including a process or host crash.
export function exchangePaths(first, second) {
  const script = 'import ctypes,os,sys\nlibc=ctypes.CDLL(None,use_errno=True)\nr=libc.renameat2(-100,os.fsencode(sys.argv[1]),-100,os.fsencode(sys.argv[2]),2)\nif r: raise OSError(ctypes.get_errno(),os.strerror(ctypes.get_errno()))\n';
  checked('python3', ['-c', script, first, second]);
}
export async function archiveSnapshot(name, { root = ROOT, archive = ARCHIVE, copy = (a,b)=>checked('rsync',['-a','--numeric-ids','--modify-window=-1','--fsync','--',a+'/',b+'/']), flush = p=>checked('sync',['-f',p]), exchange = exchangePaths, remove = p=>fs.rmSync(p,{recursive:true}), log = console.log } = {}) {
  if (!NAME.test(name)) throw Error('Unsafe snapshot name');
  noSymlinkParents(root); noSymlinkParents(archive);
  const source = path.join(root,name), destination = path.join(archive,name);
  if (!fs.lstatSync(source).isDirectory() || fs.lstatSync(source).isSymbolicLink()) throw Error('Source is not a real snapshot directory');
  if (fs.lstatSync(destination,{throwIfNoEntry:false})) throw Error(`Existing archive destination requires explicit recovery: ${name}`);
  // A failed copy is evidence requiring reconciliation, not permission for a
  // fresh UUID and another full copy on every timer tick. Refuse any inode kind,
  // including a dangling symlink, under this exact safe snapshot-name prefix.
  const partialPrefix=`.copy-${name}-`;
  if(fs.readdirSync(archive).some(entry=>entry.startsWith(partialPrefix)&&entry.length>partialPrefix.length))throw Error(`Interrupted archive copy requires explicit recovery: ${name}`);
  const before = await manifest(source);
  const space=fs.statfsSync(archive);
  const freeBytes=Number(space.bavail)*Number(space.bsize);
  if(!Number.isFinite(freeBytes)||freeBytes<before.fileBytes+1024**3)throw Error('Archive volume lacks snapshot bytes plus 1 GiB reserve; source preserved');
  const partial = path.join(archive,`.copy-${name}-${crypto.randomUUID()}`);
  fs.mkdirSync(partial,{mode:0o700});
  copy(source,partial);
  const copied = await manifest(partial);
  const stable = await manifest(source);
  if (copied.digest !== before.digest || stable.digest !== before.digest) throw Error(`Snapshot changed or archive verification failed: ${name}; source preserved`);
  fs.renameSync(partial,destination);
  flush(destination);
  const receiptPath = path.join(archive,'.receipts',`${name}.json`);
  const evidence = { schemaVersion:1, name, source, destination, manifest:before, verifiedAt:new Date().toISOString(), phase:'copy-verified' };
  writeReceipt(receiptPath,evidence);
  // The exchange leaves the original bytes at this exact root-owned tombstone.
  const old = path.join(root,`.archiving-${name}-${crypto.randomUUID()}`);
  fs.symlinkSync(destination,old,'dir');
  exchange(source,old);
  flush(root);
  const oldStat = fs.lstatSync(old);
  if (!oldStat.isDirectory() || oldStat.isSymbolicLink() || fs.realpathSync(source)!==destination) throw Error('Atomic exchange postcondition failed; both byte copies retained');
  const finalOriginal = await manifest(old);
  const finalArchive = await manifest(destination);
  if (finalOriginal.digest!==before.digest || finalArchive.digest!==before.digest) throw Error('Post-exchange verification failed; original bytes retained in tombstone');
  evidence.phase='path-switched-verified'; writeReceipt(receiptPath,evidence);
  // All paths were exact-name validated, inspected without following links, and
  // both full manifests matched immediately before this removal of duplicate bytes.
  if (path.dirname(old)!==root || !path.basename(old).startsWith(`.archiving-${name}-`)) throw Error('Unsafe duplicate path');
  remove(old);
  evidence.phase='archived'; evidence.completedAt=new Date().toISOString(); writeReceipt(receiptPath,evidence);
  log(JSON.stringify({archived:name,fileBytes:before.fileBytes,entries:before.entries,manifestSha256:before.digest}));
  return evidence;
}
export async function main(argv=process.argv.slice(2)) {
  const allowed=new Set(['--apply','--locked','--json','--help']);
  if(argv.some(a=>!allowed.has(a)))throw Error('Unknown argument');
  if(argv.includes('--help')){console.log('node scripts/archive-staging-rollbacks.mjs [--apply] [--json]\nFixed host-local paths. Dry-run by default; newest 3 and snapshots younger than 1h retained. All historical content archived and verified, never discarded.');return;}
  if(process.platform!=='linux')throw Error('Host-local archival requires Linux');
  const apply=argv.includes('--apply');
  if(!argv.includes('--locked')) {
    const args=[fileURLToPath(import.meta.url),...argv,'--locked'];
    const r=spawnSync('flock',['-x',LOCK,process.execPath,...args],{stdio:'inherit',windowsHide:true});
    if(r.status!==0)throw Error(`Archival lock/child failed (${r.status})`);return;
  }
  const identity=assertArchiveVolume();
  const entries=fs.readdirSync(ROOT,{withFileTypes:true}).map(e=>({name:e.name,kind:e.isSymbolicLink()?'symlink':e.isDirectory()?'directory':'other',mtimeMs:fs.lstatSync(path.join(ROOT,e.name)).mtimeMs}));
  if(entries.some(e=>e.name.startsWith('.archiving-')))throw Error('Interrupted archival tombstone present; explicit recovery required');
  const plan=planSnapshots(entries);
  console.log(JSON.stringify({readOnly:!apply,...plan,identity:{volume:identity.volume,uuid:identity.uuid}}));
  if(!apply)return;
  fs.mkdirSync(ARCHIVE,{recursive:true,mode:0o700});
  if(!fs.lstatSync(identity.identityFile,{throwIfNoEntry:false}))writeReceipt(identity.identityFile,{schemaVersion:1,volume:identity.volume,uuid:identity.uuid});
  for(const name of plan.candidates)await archiveSnapshot(name);
}
if(process.argv[1]&&fs.realpathSync(path.resolve(process.argv[1]))===fs.realpathSync(fileURLToPath(import.meta.url)))main().catch(e=>{console.error(`archive-staging-rollbacks: ${e.message}`);process.exitCode=1;});
