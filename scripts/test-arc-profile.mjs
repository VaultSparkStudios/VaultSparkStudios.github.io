#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadRegistry, profileFor, resolveEntry } from './arc-profile.mjs';

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'arc-profile-'));
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`✓ ${name}`); };
const write = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
};
try {
  const target = path.join(scratch, 'ReaderSite');
  const siblingRegistry = path.join(scratch, 'vaultspark-studio-ops', 'portfolio', 'PROJECT_REGISTRY.json');
  const localRegistry = path.join(target, 'portfolio', 'PROJECT_REGISTRY.json');
  write(path.join(target, 'context', 'PROJECT_STATUS.json'), { slug: 'reader-site', type: 'website', audience: 'public-live', health: 'yellow', stagingType: 'hetzner' });
  const entry = { slug: 'reader-site', folderName: 'readersite', ladderStage: 'S1', audience: 'public-live', stagingType: 'hetzner' };
  write(siblingRegistry, { projects: [entry] });
  check('propagated resolver discovers the TARGET sibling registry', () => {
    const profile = profileFor(target);
    assert.equal(profile.registryMatched, true);
    assert.equal(profile.profileSource, 'registry');
    assert.equal(profile.lifecycleFocus.stage, 'S1');
    assert.equal(profile.lifecycleFocus.mode, 'supported-release');
    assert.equal(profile.lifecycleFocus.stageSource, 'registry');
    assert.equal(profile.lifecycleFocus.health, 'yellow');
    assert.equal(profile.type, 'website');
    assert.equal(profile.hasStaging, true);
  });
  check('registry folder identity is case insensitive', () => assert.equal(resolveEntry({ projects: [entry] }, 'READERSITE'), entry));
  check('short prefixes cannot borrow another project identity', () => assert.equal(resolveEntry([entry], 'Reader'), null));
  check('backup suffixes cannot borrow another project identity', () => assert.equal(resolveEntry([entry], 'ReaderSite-backup'), null));
  check('ambiguous exact identities remain unresolved', () => assert.equal(resolveEntry([entry, { ...entry, slug: 'second-project' }], 'ReaderSite'), null));
  check('Windows local paths resolve on every host', () => {
    const windows = { slug: 'another-slug', localPath: 'C:\\workspace\\ReaderSite\\' };
    assert.equal(resolveEntry([windows], 'readersite'), windows);
  });
  write(localRegistry, { projects: [{ ...entry, ladderStage: 'F2' }] });
  check('target-owned registry takes precedence', () => assert.equal(profileFor(target).lifecycleFocus.stage, 'F2'));
  write(path.join(target, 'context', 'PROJECT_STATUS.json'), { type: 'website', audience: 'public-live', ladderStage: 'S2', health: 'red' });
  check('registry/local stage disagreement stays visible', () => {
    const focus = profileFor(target).lifecycleFocus;
    assert.deepEqual(focus.stageConflict, { registry: 'F2', projectStatus: 'S2' });
    assert.equal(focus.health, 'red');
  });
  write(localRegistry, '{broken');
  check('malformed target registry falls back to canonical sibling', () => assert.equal(loadRegistry(target).projects[0].ladderStage, 'S1'));
  write(localRegistry, { wrongShape: [] });
  check('invalid registry schema cannot hide canonical sibling', () => assert.equal(profileFor(target).registryMatched, true));
  const unrelated = path.join(scratch, 'Unrelated');
  write(path.join(unrelated, 'context', 'PROJECT_STATUS.json'), { type: 'website', audience: 'public-live' });
  check('unrelated target cannot borrow a neighboring project stage', () => {
    const profile = profileFor(unrelated);
    assert.equal(profile.registryMatched, false);
    assert.equal(profile.lifecycleFocus.stage, null);
  });
  fs.unlinkSync(localRegistry);
  fs.unlinkSync(siblingRegistry);
  check('missing registries preserve local status evidence', () => {
    const profile = profileFor(target);
    assert.equal(profile.profileSource, 'project-status');
    assert.equal(profile.lifecycleFocus.stage, 'S2');
    assert.equal(profile.lifecycleFocus.stageSource, 'project-status');
  });
  check('missing target evidence remains unknown rather than using executing checkout', () => {
    const profile = profileFor(path.join(scratch, 'Missing'));
    assert.equal(profile.profileSource, 'fallback');
    assert.equal(profile.lifecycleFocus.stage, null);
    assert.equal(profile.lifecycleFocus.health, 'unknown');
  });
  console.log(`arc-profile: ${passed}/${passed} passed`);
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
