/**
 * A Trusted Types REPORT-ONLY notice, in every engine's own words.
 *
 * `require-trusted-types-for 'script'` ships Report-Only by design while the
 * soak runs, so these notices are observations, not failures - that has always
 * been the intent. The bug was that the classifier only knew CHROMIUM's
 * phrasing ("[Report Only] This requires a TrustedHTML value else it violates
 * ..."). Firefox says something else entirely:
 *
 *   [JavaScript Error: "Content-Security-Policy: (Report-Only policy) The
 *   page's settings would block assigning to an injection sink because it
 *   violates the following directive: "require-trusted-types-for 'script'""]
 *
 * so in Firefox every report-only notice fell through to `consoleErrors` and
 * failed `expect(consoleErrors).toEqual([])`. Because the sinks in question run
 * off async renders, it fired on some runs and not others - which Playwright
 * reports as FLAKY, and a flaky result rejects the release ceremony. That is
 * what blocked the S337 production deploy: not a defect on the site, but a
 * Chromium-shaped assertion applied to three engines.
 *
 * Matching is deliberately conjunctive - a report-only marker AND a Trusted
 * Types marker - rather than a looser single phrase. A genuine page error can
 * carry neither, so this cannot widen into swallowing real failures, and an
 * ENFORCED Trusted Types violation (no report-only marker) still fails loudly,
 * which is exactly the signal the enforce flip needs to stay trustworthy.
 */
const TT_REPORT_ONLY_MARKER = /\[Report Only\]|\(Report-Only policy\)|Report-Only policy|report-only/i;
const TT_DIRECTIVE_MARKER = /TrustedHTML|TrustedScript|require-trusted-types-for|injection sink|trusted types/i;

function isTrustedTypesReportOnly(text) {
  const s = String(text || '');
  return TT_REPORT_ONLY_MARKER.test(s) && TT_DIRECTIVE_MARKER.test(s);
}

module.exports = { isTrustedTypesReportOnly };
