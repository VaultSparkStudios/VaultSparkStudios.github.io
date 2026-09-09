/** Interpret observations separately from process/transport health. */
export function parseScheduledProbe(out, code, execution = {}) {
  const unavailable = (detail) => ({ pass: false, warn: true, detail });
  if (execution.error || execution.signal) {
    return unavailable(execution.error?.code === 'ETIMEDOUT'
      ? 'scheduled observation timed out; not evaluated'
      : `scheduled observation unavailable (${execution.error?.code || execution.signal || 'execution failed'})`);
  }
  try {
    const d = JSON.parse(out.trim());
    if (!d || Array.isArray(d) || typeof d !== 'object' || ![0, 1].includes(code)) throw new Error('invalid envelope or exit');
    if (d.skipped === true) {
      if (code !== 0 || typeof d.reason !== 'string') throw new Error('invalid skip');
      return unavailable(`unverified (${d.reason})`);
    }
    if (!Array.isArray(d.broken) || !Array.isArray(d.silent) || !Array.isArray(d.noData)
      || !Number.isInteger(d.checked) || d.checked < 0
      || !Number.isInteger(d.unreachable) || d.unreachable < 0
      || !d.broken.every(v => v && typeof v.name === 'string' && Number.isInteger(v.streak) && v.streak > 0)
      || !d.silent.every(v => v && typeof v.name === 'string')
      || !d.noData.every(v => typeof v === 'string')
      || d.broken.length + d.silent.length + d.noData.length > d.checked) throw new Error('invalid observations');
    const failures = d.broken.length + d.silent.length;
    if (d.ok !== (failures === 0) || code !== (failures ? 1 : 0)) throw new Error('contradictory outcome');
    const scope = `${d.checked} checked; ${d.noData.length} unmeasured; ${d.unreachable} unreachable`;
    if (failures) {
      const names = [
        ...d.broken.map(v => `${v.name} (${v.streak} failures)`),
        ...d.silent.map(v => `${v.name} (silent)`),
      ];
      return { pass: false, detail: `${names.join(', ')}; ${scope}` };
    }
    if (!d.checked || d.noData.length || d.unreachable || d.timedOut) return unavailable(scope);
    return { pass: true, detail: `${d.checked} scheduled workflows checked; none broken or silent` };
  } catch {
    return unavailable('scheduled observation invalid or missing; not evaluated');
  }
}
