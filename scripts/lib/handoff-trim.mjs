// handoff-trim.mjs — S366 [audit #1]. Pure trim of LATEST_HANDOFF.md to its newest sessions.
//
// The split below consumes the newline that precedes every `## Where We Left Off`
// boundary. compact-handoff.mjs used to rejoin the pieces with '' — so the header's last
// line and the first kept session's heading fused into one line, and every kept session
// fused onto the previous one's tail. S365's autopilot then aborted at Step 3q (handoff
// coherence) on its own trim. Rejoining with '\n' restores exactly the bytes the split
// removed: the kept text is byte-identical to the original prefix it came from.

export const SESSION_BOUNDARY = /\n(?=## Where We Left Off)/;

/**
 * @param {string} raw    full LATEST_HANDOFF.md text
 * @param {number} keep   newest sessions to keep
 * @returns {{ trimmed: boolean, header: string|null, kept: string[], archived: string[], text: string, archiveText: string }}
 *   `text` is the new LATEST_HANDOFF.md; `archiveText` the sessions to append to the archive.
 */
export function trimHandoffText(raw, keep = 2) {
  const normalized = String(raw ?? '').replace(/\r\n/g, '\n');
  const sections = normalized.split(SESSION_BOUNDARY);
  const header = sections[0].trimStart().startsWith('## Where We Left Off') ? null : sections.shift();
  if (sections.length <= keep) {
    return { trimmed: false, header, kept: sections, archived: [], text: normalized, archiveText: '' };
  }
  const kept = sections.slice(0, keep);
  const archived = sections.slice(keep);
  const archiveBody = archived.join('\n');
  return {
    trimmed: true,
    header,
    kept,
    archived,
    // The last kept section was followed by a boundary, whose '\n' the split consumed.
    text: `${(header === null ? kept : [header, ...kept]).join('\n')}\n`,
    // The last archived section is the file's own tail; nothing was consumed after it.
    archiveText: archiveBody.endsWith('\n') ? archiveBody : `${archiveBody}\n`,
  };
}
