# Website staging rollback archival

Website staging keeps incremental rsync backup history under
`/opt/studio/staging/website/.rollback`. A directory is one deployment's replaced
or removed files, not necessarily an independently restorable full site.

`scripts/archive-staging-rollbacks.mjs` retains the newest three real snapshot
directories on the system disk and also leaves snapshots younger than one hour
untouched. Older directories are copied to
`/mnt/HC_Volume_106991932/studio-archives/website-staging/rollback`. Their original
paths become symlinks to those archives, so no historical content is discarded
and existing rollback paths continue to resolve. This bounds settled local
history by count; it does not claim that the newest three have a fixed byte size.

The fixed mount and filesystem UUID are checked before work. A missing/wrong
volume refuses archival and website deployment preflight. Every snapshot has
SHA-256 content and metadata manifests before/after copying and before duplicate
removal. Symlinks, nonregular files, multiply linked files and extended metadata
(including ACLs/xattrs) inside a snapshot require explicit operator handling.
They are refused rather than copied with lost metadata. Source and target files
must fit with a 1 GiB archive-volume reserve. `rsync --fsync`, filesystem `sync -f`
and durable receipts precede duplicate removal. Linux `renameat2(RENAME_EXCHANGE)`
switches the rollback path atomically. Both deployment producers and the archiver
hold `/var/lock/website-staging-rollback.lock`; an already-locked producer invokes
the internal `--locked` child mode without reacquiring the lock.

## Install and verify

Install the reviewed script and its `scripts/lib/safe-spawn.mjs` dependency in an
immutable owner package under `/opt/vaultspark-maintenance/`, and expose the script
through `/opt/vaultspark-maintenance/archive-staging-rollbacks.mjs`. Run its Linux
fixtures before live use:

```
node --test tests/rollback-archive.unit.spec.mjs
node /opt/vaultspark-maintenance/archive-staging-rollbacks.mjs
node /opt/vaultspark-maintenance/archive-staging-rollbacks.mjs --apply
```

Dry-run is the default. Install the matching `infra/website-rollback-archive.*`
systemd units and enable the timer for periodic enforcement. Deployment hooks
also archive after each deployment, while holding the same lock. Initial
migration must additionally verify that old, uncoordinated deployment processes
are absent and selected snapshots have no live process references. Do not infer
that from age alone. Subsequent source consumers must adopt the producer lock;
signed delivery alone is not adoption proof.

## Interrupted transactions

Never delete `.copy-*`, an existing archive destination or `.archiving-*` by age.
A copy interruption leaves the source in place; publish-before-switch leaves
both copies; exchange-before-removal leaves the original bytes in a tombstone
and the live rollback path resolving to its archive. The helper refuses ambiguous
retry states. Under the shared lock, compare the recorded full manifest with
both actual trees, establish every writer/reference terminal, and either finish
the verified duplicate removal or atomically restore the original directory.
Retain all copies on unknown or mismatched evidence. Check the original rollback
path, receipt phase, root and archive free space, timer status, staging HTTP
readback and production health after recovery. Filesystem space actually regained
must be measured; logical Docker image sizes do not prove root-disk recovery.

## Implementation verification

On 2026-10-23, the Linux fixture run passed all ten tests with zero skips,
including actual atomic exchange and stable-symlink CLI execution, corrupt-copy
refusal, changed-source refusal, existing-destination refusal, wrong-volume UUID,
and retained original bytes after simulated duplicate-removal failure. Website
full-deploy and content-deploy self-tests passed 17/17 and 26/26 respectively.
Independent source review accepted utility SHA-256
`9958f2d11fe26739d821802be0ba63bca088dc91ab0fee753ec3ddcf1229f943`.
The exact utility was installed as an immutable host package; initial migration
was started after a fresh mount/UUID and process-reference census. These tests
prove implementation behavior, not completion of every live snapshot migration.
The timer runs every 15 minutes with up to 30 seconds of scheduling jitter.
