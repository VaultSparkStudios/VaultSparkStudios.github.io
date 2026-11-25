import fs from 'node:fs';
import { createHash } from 'node:crypto';

export const MEMBERSHIP_RASTER = Object.freeze({
  primary: 'membership-iphone-se-light.png',
  primarySha256: '052a25d5c653294d66a76bd1975cc80272828b1f2c7998211213abcd7351977c',
  alternate: 'membership-iphone-se-light-reviewed-raster.png',
  alternateSha256: '775ea84d5f011093edb3a2ada44619d2483e2266500b163578b598ce8a21b34a',
});

export function knownMembershipRasterScope(identity, project, platform) {
  return platform === 'linux' && project?.use?.browserName === 'chromium' &&
    identity.surface === 'membership' && identity.viewport === 'iphone-se' && identity.theme === 'light';
}

// Two full native rasters were independently inspected: G16 first/retry and
// G5ee8 first/retry. Copy, wrapping and boxes agree; some glyphs differ by 1px.
// This records two observed states, not a font-cause claim or wider tolerance.
export async function expectReviewedMembershipRaster({ identity, testInfo, match, platform = process.platform }) {
  const primaryOptions = { fullPage: false, maxDiffPixelRatio: 0.015, animations: 'disabled' };
  const snapshotName = identity.surface + '-' + identity.viewport + '-' + identity.theme + '.png';
  if (!knownMembershipRasterScope(identity, testInfo.project, platform)) {
    return match(snapshotName, primaryOptions);
  }
  if (!['none', 'default'].includes(testInfo.config.updateSnapshots)) throw Error('Reviewed Membership raster requires updateSnapshots none or default');
  const verifyFixtures = () => {
    for (const [name, expected] of [[MEMBERSHIP_RASTER.primary, MEMBERSHIP_RASTER.primarySha256],
      [MEMBERSHIP_RASTER.alternate, MEMBERSHIP_RASTER.alternateSha256]]) {
      const file = testInfo.snapshotPath(name, { kind: 'screenshot' });
      const bytes = fs.readFileSync(file);
      if (createHash('sha256').update(bytes).digest('hex') !== expected) throw Error('Reviewed Membership raster fixture drift: ' + name);
    }
  };
  verifyFixtures();
  try {
    await match(MEMBERSHIP_RASTER.primary, primaryOptions);
    verifyFixtures();
    return { matched: 'primary' };
  } catch (primaryError) {
    if (primaryError?.matcherResult?.name !== 'toHaveScreenshot') throw primaryError;
    verifyFixtures();
    // Still use Playwright's stable native screenshot matcher, requiring every
    // pixel of the alternate; no masking, style injection, or hash-only pass.
    await match(MEMBERSHIP_RASTER.alternate, {
      fullPage: false, maxDiffPixels: 0, maxDiffPixelRatio: 0, threshold: 0, animations: 'disabled',
    });
    verifyFixtures();
    await testInfo.attach('reviewed-membership-raster-choice', {
      body: Buffer.from(JSON.stringify({ scope: 'membership/iphone-se/light/linux/chromium only',
        primaryMatcherFailed: true, alternateNativeExactMatch: true, ...MEMBERSHIP_RASTER })),
      contentType: 'application/json',
    });
    return { matched: 'reviewed-alternate' };
  }
}
