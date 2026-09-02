/**
 * S339 (D-S339.3) — the receipt round trip, as a reusable PROPERTY.
 *
 * Background. A receipt that is emitted by `derive(observation)` and later
 * re-derived from disk needs a reader that reconstructs the observation. Three
 * separate times on this repo a field was added to the emitter and forgotten in
 * the reader — `retainedForHours` (S300), `historyComplete` (S316), and the
 * S336 content clock (found in S338). Every one of them was caught only after it
 * had already reddened a cron in production, and every one was fixed by adding a
 * line to a hand-maintained list plus a hand-written assertion naming that field.
 *
 * A list of the fields someone remembered cannot cover the field nobody has
 * written yet. The property can:
 *
 *     derive(read(derive(x))) === derive(x)
 *
 * S338 closed this for `build-deploy-currency` with an inline case. The reason it
 * lives here now rather than there is that the defect is a CLASS, not an
 * instance: the second re-derive site to be written will need the same property,
 * and a copy-pasted assertion is exactly how the first three were lost. Pairing
 * this module with `check-receipt-roundtrip-coverage.mjs` means a new re-derive
 * site cannot ship without it.
 *
 * Note what makes the guard real: it compares against a FULLY-POPULATED
 * observation. A fixed-point test over a sparse fixture is self-consistently
 * green while silently dropping every field the fixture omits — which is exactly
 * why the S300-era test of this same shape stayed green through all three losses.
 */

/**
 * Assert that every field a receipt emits survives being read back and re-derived.
 *
 * @param {object}   spec
 * @param {Function} spec.derive     observation -> receipt payload
 * @param {Function} spec.read       receipt payload -> observation
 * @param {object}   spec.populated  an observation with EVERY optional field set
 * @returns {{ ok: boolean, drifted: string[], label: string }}
 */
export function receiptRoundTrip({ derive, read, populated }) {
  const once = derive(populated);
  const twice = derive(read(once));
  const keys = new Set([...Object.keys(once), ...Object.keys(twice)]);
  const drifted = [...keys].filter((k) => JSON.stringify(once[k]) !== JSON.stringify(twice[k])).sort();
  return {
    ok: drifted.length === 0,
    drifted,
    label: `EVERY emitted field survives the receipt round trip${drifted.length ? ` (drifted: ${drifted.join(', ')})` : ''}`,
  };
}

/**
 * Prove the detector detects.
 *
 * A fixed-point test over a function that drops the same field on BOTH passes is
 * self-consistently green — it reports success while measuring nothing. So the
 * round trip is only trustworthy alongside a companion that strips a field the
 * way a forgotten one would arrive and asserts the guard goes red.
 *
 * @param {object}   spec
 * @param {Function} spec.derive
 * @param {Function} spec.read
 * @param {object}   spec.populated
 * @param {string}   spec.stripField  a field the reader is known to restore
 * @returns {{ ok: boolean, label: string }}
 */
export function receiptRoundTripCanFail({ derive, read, populated, stripField }) {
  const once = derive(populated);
  if (!(stripField in once)) {
    return { ok: false, label: `the round-trip guard can actually fail (fixture never emitted "${stripField}", so nothing was proved)` };
  }
  const { [stripField]: _dropped, ...stripped } = once;
  const ok = JSON.stringify(derive(read(stripped))) !== JSON.stringify(once);
  return { ok, label: 'the round-trip guard can actually fail' };
}

/**
 * Both halves as self-test rows, so a caller adds one line and gets the property
 * plus its proof-of-liveness together — they are worthless apart.
 *
 * @returns {Array<[string, boolean]>}
 */
export function receiptRoundTripCases(spec) {
  const trip = receiptRoundTrip(spec);
  const canFail = receiptRoundTripCanFail(spec);
  return [[trip.label, trip.ok], [canFail.label, canFail.ok]];
}
