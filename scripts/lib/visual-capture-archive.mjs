import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from './safe-spawn.mjs';

const EXTRACT = String.raw`
import pathlib, stat, sys, zipfile, re
archive, target = sys.argv[1:]
with zipfile.ZipFile(archive) as z:
    entries = z.infolist()
    if len(entries) > 300 or sum(i.file_size for i in entries) > 268435456: raise ValueError('archive bounds')
    names = set()
    files = []
    for i in entries:
        name = i.filename
        parts = name.rstrip('/').split('/')
        if not name or '\\' in name or name.startswith('/') or any(p in ('', '.', '..') or ':' in p for p in parts): raise ValueError('unsafe path')
        if name in names: raise ValueError('duplicate path')
        names.add(name)
        mode = i.external_attr >> 16
        if stat.S_IFMT(mode) not in (0, stat.S_IFDIR, stat.S_IFREG): raise ValueError('nonregular member')
        if i.is_dir(): continue
        receipt = name == '.cache/visual-capture-source.json'
        png = re.fullmatch(r'tests/__snapshots__/visual-regression.spec.js-snapshots/[a-z0-9-]+\.png', name)
        if not receipt and not png: raise ValueError('unexpected member')
        if receipt and i.file_size > 8192: raise ValueError('receipt bound')
        data = z.read(i)
        if png and not data.startswith(b'\x89PNG\r\n\x1a\n'): raise ValueError('invalid PNG')
        files.append((name, data))
    if '.cache/visual-capture-source.json' not in names: raise ValueError('missing provenance')
    for name, data in files:
        dest = pathlib.Path(target).joinpath(*name.split('/'))
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
`;

export function extractCaptureArchive(bytes, artifact, directory) {
  if (!Buffer.isBuffer(bytes) || bytes.length > 268435456 || bytes.length !== artifact?.size_in_bytes
    || artifact?.digest !== 'sha256:' + createHash('sha256').update(bytes).digest('hex')) {
    throw new Error('Capture archive bytes do not match the admitted artifact size and SHA-256.');
  }
  fs.mkdirSync(directory, { recursive: true });
  const archive = path.join(directory, 'capture.zip');
  fs.writeFileSync(archive, bytes, { flag: 'wx' });
  const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', EXTRACT, archive, directory],
    { encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 });
  if (result.status !== 0) throw new Error('Capture archive extraction refused; Python 3 and a bounded regular PNG/provenance-only ZIP are required.');
  fs.unlinkSync(archive);
}
