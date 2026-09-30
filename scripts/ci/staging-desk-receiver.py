#!/usr/bin/env python3
"""Forced-command receiver for the staging-only Desk release key.

Install root-owned at /usr/local/sbin/vss-desk-content-receiver with the
matching root-owned path rules at /usr/local/etc/vss-desk-content-paths.json.
The SSH key can invoke only this program; no caller-provided command or path is
executed. The served staging root is fixed and production is unreachable here.
"""
import hashlib
import io
import json
import os
import re
import shutil
import sys
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path('/opt/studio/staging/website')
RULES = Path('/usr/local/etc/vss-desk-content-paths.json')
MANIFEST = '.cache/staging-desk-release.json'
MAX_ARCHIVE_BYTES = 50 * 1024 * 1024
MAX_FILE_BYTES = 15 * 1024 * 1024
MAX_TOTAL_BYTES = 150 * 1024 * 1024
MAX_FILES = 300
SHA = re.compile(r'^[0-9a-f]{40}$')


class LimitedReader:
    def __init__(self, source):
        self.source = source
        self.total = 0

    def read(self, size=-1):
        chunk = self.source.read(size)
        self.total += len(chunk)
        if self.total > MAX_ARCHIVE_BYTES:
            raise ValueError('compressed archive exceeds limit')
        return chunk


def allowed_path(value, rules):
    if not isinstance(value, str) or len(value) > 240:
        return False
    if value.startswith('/') or '\\' in value or '\x00' in value:
        return False
    if any(part in ('', '.', '..') for part in value.split('/')):
        return False
    return value in rules['exact'] or any(re.fullmatch(pattern, value) for pattern in rules['patterns'])


def within_root(value):
    target = ROOT.joinpath(value)
    parent = str(target.parent.resolve())
    root = str(ROOT.resolve())
    if parent != root and not parent.startswith(root + os.sep):
        raise ValueError('path leaves staging root')
    if target.is_symlink():
        raise ValueError('symlink target refused')
    return target


def receive():
    if os.geteuid() != 0:
        raise ValueError('receiver must run through its exact sudo rule')
    if os.environ.get('SSH_ORIGINAL_COMMAND', '') not in ('', 'deploy-desk-content'):
        raise ValueError('SSH command refused')
    if not ROOT.is_dir() or ROOT.is_symlink():
        raise ValueError('fixed staging root unavailable')
    rules = json.loads(RULES.read_text(encoding='utf8'))
    if rules.get('schemaVersion') != 1:
        raise ValueError('path rules version mismatch')
    with tempfile.TemporaryDirectory(prefix='vss-desk-release-') as scratch:
        scratch_path = Path(scratch)
        archive = tarfile.open(fileobj=LimitedReader(sys.stdin.buffer), mode='r|gz')
        manifest = None
        received = {}
        total = 0
        for member in archive:
            if not member.isfile() or member.issym() or member.islnk():
                raise ValueError('archive contains a non-regular member')
            name = member.name
            if name == MANIFEST:
                if manifest is not None or member.size > 200_000:
                    raise ValueError('duplicate or oversized manifest')
                manifest = json.loads(archive.extractfile(member).read().decode('utf8'))
                continue
            if not allowed_path(name, rules) or name in received:
                raise ValueError('archive path refused')
            if member.size > MAX_FILE_BYTES or len(received) >= MAX_FILES:
                raise ValueError('archive file limit exceeded')
            total += member.size
            if total > MAX_TOTAL_BYTES:
                raise ValueError('archive total limit exceeded')
            source = archive.extractfile(member)
            target = scratch_path.joinpath(str(len(received)))
            digest = hashlib.sha256()
            with target.open('wb') as output:
                while True:
                    block = source.read(1024 * 1024)
                    if not block:
                        break
                    digest.update(block)
                    output.write(block)
            received[name] = (target, digest.hexdigest())
        archive.close()
        if not isinstance(manifest, dict) or manifest.get('schemaVersion') != 1:
            raise ValueError('manifest missing or invalid')
        baseline = manifest.get('baselineSha')
        head = manifest.get('headSha')
        files = manifest.get('files')
        if not SHA.fullmatch(str(baseline)) or not SHA.fullmatch(str(head)):
            raise ValueError('commit identifier invalid')
        if not isinstance(files, dict) or set(files) != set(received) or not files:
            raise ValueError('manifest file set differs from archive')
        for name, (_, digest) in received.items():
            if files[name] != digest:
                raise ValueError('file digest mismatch')
        pathset = hashlib.sha256(('\n'.join(sorted(received)) + '\n').encode('utf8')).hexdigest()
        if pathset != manifest.get('pathSetSha256'):
            raise ValueError('path set digest mismatch')
        served = json.loads(ROOT.joinpath('api/build-sha.json').read_text(encoding='utf8'))
        if served.get('sha') != baseline:
            raise ValueError('staging baseline changed')
        stamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
        rollback = ROOT.joinpath('.rollback', 'desk-' + stamp)
        for name in sorted(received):
            destination = within_root(name)
            destination.parent.mkdir(parents=True, exist_ok=True)
            if destination.exists():
                old = rollback.joinpath(name)
                old.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(destination, old)
            temp_fd, temp_name = tempfile.mkstemp(prefix='.desk-', dir=destination.parent)
            try:
                with os.fdopen(temp_fd, 'wb') as output, received[name][0].open('rb') as source:
                    shutil.copyfileobj(source, output)
                    output.flush()
                    os.fsync(output.fileno())
                os.chmod(temp_name, 0o644)
                os.replace(temp_name, destination)
            finally:
                if os.path.exists(temp_name):
                    os.unlink(temp_name)
        receipt = {
            'schemaVersion': '1.1',
            'generatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            'sha': baseline,
            'baselineSha': baseline,
            'builtAt': datetime.now(timezone.utc).isoformat(),
            'deployedBy': 'staging-desk-content-lane',
            'contentLaneHead': head,
            'contentLanePaths': f'{len(received)} paths',
            'contentLanePathSetSha256': pathset,
        }
        receipt_path = ROOT.joinpath('api/build-sha.json')
        temp_fd, temp_name = tempfile.mkstemp(prefix='.desk-', dir=receipt_path.parent)
        with os.fdopen(temp_fd, 'w', encoding='utf8') as output:
            json.dump(receipt, output, indent=2)
            output.write('\n')
        os.chmod(temp_name, 0o644)
        os.replace(temp_name, receipt_path)
        print(f'STAGING_DESK_DEPLOYED {head[:12]} {len(received)} files')


def self_test():
    rules = json.loads(Path('config/desk-content-paths.json').read_text(encoding='utf8'))
    good = ['index.html', 'news/index.html', 'news/2026-09-30/example/index.html', 'assets/og/news/2026-09-30--example.png', 'api/news-desk-feed.json']
    bad = ['auth/index.html', 'news/../auth/index.html', 'api/security-posture.json', 'sw.js', '.github/workflows/x.yml']
    assert all(allowed_path(value, rules) for value in good)
    assert all(not allowed_path(value, rules) for value in bad)
    print(f'staging-desk-receiver --self-test: {len(good) + len(bad)} paths passed')


if __name__ == '__main__':
    try:
        if sys.argv[1:] == ['--self-test']:
            self_test()
        elif len(sys.argv) == 1:
            receive()
        else:
            raise ValueError('arguments refused')
    except Exception as error:
        print(f'STAGING_DESK_REFUSED {error}', file=sys.stderr)
        sys.exit(1)
