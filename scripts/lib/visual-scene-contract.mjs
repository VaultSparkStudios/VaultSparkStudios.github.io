// Visual viewport intent, independent of pixel baselines and app timing.
const top = pathname => Object.freeze({ kind: 'document-top', pathname, hash: '', anchorId: null });
const anchor = (pathname, hash) => Object.freeze({ kind: 'named-fragment', pathname, hash, anchorId: hash.slice(1) });
export const VISUAL_SCENES = Object.freeze({
  home: top('/'), membership: top('/membership/'), 'vault-member': top('/vault-member/'),
  games: top('/games/'), tombstones: top('/vault/tombstones/'),
  journal: anchor('/changelog/', '#stories'), oracle: anchor('/ignis/', '#oracle'),
});

// Same CSS-pixel rounding allowance used by existing anchor-arrival checks.
export const SCENE_POSITION_TOLERANCE = 1.1;

export function visualSceneState(surface, observed) {
  const scene = Object.hasOwn(VISUAL_SCENES, surface) ? VISUAL_SCENES[surface] : null;
  const flags = { sceneKnown: !!scene, pathMatches: false, hashMatches: false,
    geometryKnown: false, targetPresent: false, scrollMatches: false, sceneReady: false };
  if (!scene || !observed || typeof observed !== 'object') return flags;
  flags.pathMatches = observed.pathname === scene.pathname;
  flags.hashMatches = observed.hash === scene.hash;
  flags.geometryKnown = [observed.scrollX, observed.scrollY, observed.maxScrollY]
    .every(Number.isFinite) && observed.maxScrollY >= 0;
  flags.targetPresent = scene.kind === 'document-top' ||
    (observed.target?.present === true && observed.target.visible === true &&
      Number.isFinite(observed.target.documentTop) && Number.isFinite(observed.target.scrollMarginTop));
  if (flags.geometryKnown && flags.targetPresent) {
    const expectedY = scene.kind === 'document-top' ? 0 : Math.max(0,
      Math.min(observed.maxScrollY, observed.target.documentTop - observed.target.scrollMarginTop));
    flags.scrollMatches = scene.kind === 'document-top' ?
      observed.scrollX === 0 && observed.scrollY === 0 :
      Math.abs(observed.scrollX) <= SCENE_POSITION_TOLERANCE &&
        Math.abs(observed.scrollY - expectedY) <= SCENE_POSITION_TOLERANCE;
  }
  flags.sceneReady = flags.pathMatches && flags.hashMatches && flags.geometryKnown &&
    flags.targetPresent && flags.scrollMatches;
  return flags;
}
