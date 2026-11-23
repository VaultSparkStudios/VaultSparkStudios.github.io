import { stepBlocks, stripShellComments } from '../check-ci-publisher-resilience.mjs';

// Reviewed immutable Desk protocol v1. Exact executable critical blocks are
// deliberate: unsupported changes require contract review, not a name exemption.
const AUTHOR_HEADER = [
  "    runs-on: ubuntu-latest",
  "    permissions:",
  "      contents: read",
  "    outputs:",
  "      ready: ${{ steps.artifact.outputs.ready }}",
  "      manifest_sha256: ${{ steps.artifact.outputs.manifest_sha256 }}",
  "      edition: ${{ steps.slot.outputs.edition }}",
  "      retry_attempt: ${{ steps.slot.outputs.retry_attempt }}"
].join('\n');
const AUTHOR_CHECKOUT_STEP = [
  "      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262",
  "        with:",
  "          fetch-depth: 0",
  "          persist-credentials: false"
].join('\n');
const PUBLISH_JOB = [
  "    needs: author",
  "    if: needs.author.outputs.ready == 'yes'",
  "    runs-on: ubuntu-latest",
  "    permissions:",
  "      contents: write",
  "      actions: read",
  "    outputs:",
  "      retry: ${{ steps.publish.outputs.retry }}",
  "    steps:",
  "      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262",
  "        with:",
  "          ref: ${{ github.sha }}",
  "          fetch-depth: 0",
  "      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020",
  "        with:",
  "          node-version: \"22\"",
  "      - name: Download this run's immutable validated artifact",
  "        env:",
  "          GH_TOKEN: ${{ github.token }}",
  "          GH_REPO: ${{ github.repository }}",
  "          RUN_ID: ${{ github.run_id }}",
  "          ARTIFACT_NAME: desk-publication-${{ github.run_id }}-${{ github.run_attempt }}",
  "        run: gh run download \"$RUN_ID\" --name \"$ARTIFACT_NAME\" --dir \"$RUNNER_TEMP/desk-publication\"",
  "      - name: Verify and stage the exact validated candidate",
  "        env:",
  "          EXPECTED_MANIFEST_SHA256: ${{ needs.author.outputs.manifest_sha256 }}",
  "        run: |",
  "          node scripts/desk-publication-artifact.mjs --apply --input \"$RUNNER_TEMP/desk-publication\" --expected-manifest-sha256 \"$EXPECTED_MANIFEST_SHA256\"",
  "      - name: Publish without changing the validated artifact",
  "        id: publish",
  "        env:",
  "          EDITION: ${{ needs.author.outputs.edition }}",
  "        run: |",
  "          case \"$EDITION\" in wire|midday|close|latenight) ;; *) exit 1 ;; esac",
  "          base_sha=\"$(git rev-parse HEAD)\"",
  "          git config user.name \"github-actions[bot]\"",
  "          git config user.email \"github-actions[bot]@users.noreply.github.com\"",
  "          git commit -m \"feat(desk): publish the $EDITION edition [skip ci]\"",
  "          candidate_sha=\"$(git rev-parse HEAD)\"",
  "          if ! git push origin HEAD:main; then",
  "            git fetch --no-tags origin main",
  "            remote_sha=\"$(git rev-parse FETCH_HEAD)\"",
  "            if git merge-base --is-ancestor \"$candidate_sha\" \"$remote_sha\"; then",
  "              echo \"Validated candidate $candidate_sha is already on main.\" >> \"$GITHUB_STEP_SUMMARY\"",
  "              exit 0",
  "            fi",
  "            if [[ \"$remote_sha\" =~ ^[0-9a-f]{40}$ ]] && [ \"$remote_sha\" != \"$base_sha\" ]; then",
  "              echo \"retry=yes\" >> \"$GITHUB_OUTPUT\"",
  "              echo \"Validated source $base_sha lost the main race to $remote_sha; artifact unchanged.\" >> \"$GITHUB_STEP_SUMMARY\"",
  "            fi",
  "            exit 1",
  "          fi",
  "          echo \"Published the exact validated $EDITION artifact.\" >> \"$GITHUB_STEP_SUMMARY\""
].join('\n');
const REGENERATE_JOB = [
  "    needs: [author, publish]",
  "    if: always() && needs.author.result == 'success' && needs.publish.outputs.retry == 'yes' && needs.author.outputs.retry_attempt != '2'",
  "    runs-on: ubuntu-latest",
  "    permissions:",
  "      actions: write",
  "    steps:",
  "      - name: Regenerate the whole pipeline at current main (at most two retries)",
  "        env:",
  "          GH_TOKEN: ${{ github.token }}",
  "          GH_REPO: ${{ github.repository }}",
  "          EDITION: ${{ needs.author.outputs.edition }}",
  "          RETRY_ATTEMPT: ${{ needs.author.outputs.retry_attempt }}",
  "          PRIOR_RUN_ID: ${{ github.run_id }}",
  "        run: |",
  "          case \"$EDITION\" in wire|midday|close|latenight) ;; *) exit 1 ;; esac",
  "          case \"$RETRY_ATTEMPT\" in 0|1) ;; *) exit 1 ;; esac",
  "          next_attempt=$((RETRY_ATTEMPT + 1))",
  "          gh workflow run news-publish.yml --ref main -f edition=\"$EDITION\" -f retry_attempt=\"$next_attempt\" -f retry_of_run_id=\"$PRIOR_RUN_ID\"",
  "          echo \"Requested whole-pipeline regeneration $next_attempt/2 on main, after run $PRIOR_RUN_ID.\" >> \"$GITHUB_STEP_SUMMARY\""
].join('\n');
const CAPTURE_STEP = [
  "      - name: Capture the exact gated publication artifact",
  "        id: artifact",
  "        if: steps.promote.outputs.ok == 'yes'",
  "        env:",
  "          DESK_ARTIFACT_DIR: ${{ runner.temp }}/desk-publication",
  "        run: |",
  "          git add index.html data/news-desk/ assets/og/news/ data/lqip-map.json api/news-desk.json api/news-desk-feed.json api/news-desk-claims.ndjson api/news-desk-search.json api/news-desk-search-*.json api/news-desk-stats.json api/news-desk-freshness.json api/news-desk-reactions.json api/news-desk-engagement.json api/news-visual-receipts.json api/news-critique-packets.json api/newsroom-run.json api/candidate-artifact-manifest.json api/deploy-currency.json api/release-proof.json api/status-proof.json api/citation.json api/intent-map.json api/studio-timeline.json data/stats-surface.json stats.json api/ecosystem-stats.json news/ sitemap.xml sitemap-page/index.html assets/shell-manifest.json sw.js",
  "          if [ -e data/news-desk-engagement-history.ndjson ]; then",
  "            git add data/news-desk-engagement-history.ndjson",
  "          fi",
  "          if git diff --cached --quiet; then",
  "            echo \"Nothing new to publish for the ${{ steps.slot.outputs.edition }} slot\"",
  "          else",
  "            node scripts/desk-publication-artifact.mjs --capture --output \"$DESK_ARTIFACT_DIR\"",
  "          fi"
].join('\n');
const UPLOAD_STEP = [
  "      - name: Upload the validated candidate",
  "        if: steps.artifact.outputs.ready == 'yes'",
  "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
  "        with:",
  "          name: desk-publication-${{ github.run_id }}-${{ github.run_attempt }}",
  "          path: ${{ runner.temp }}/desk-publication/",
  "          if-no-files-found: error",
  "          retention-days: 2"
].join('\n');
const GATES_STEP = [
  "      - name: Desk gates — the decision surface",
  "        if: steps.promote.outputs.ok == 'yes'",
  "        run: |",
  "          node scripts/check-news-ai-disclosure.mjs",
  "          node scripts/check-news-claim-parity.mjs",
  "          node scripts/check-news-stats-coherence.mjs",
  "          node scripts/check-news-engagement-coherence.mjs",
  "          node scripts/build-news-desk.mjs --check",
  "          node scripts/generate-news-pages.mjs --check",
  "          node scripts/build-news-freshness.mjs --check"
].join('\n');
const CADENCE_STEP = [
  "      - name: Enforce a same-day edition (late-night slot)",
  "        if: always() && steps.slot.outputs.edition == 'latenight'",
  "        run: node scripts/build-news-freshness.mjs --require-today"
].join('\n');
const CASCADE_STEP = [
  "      - name: Cascade the derived public feeds",
  "        if: steps.promote.outputs.ok == 'yes'",
  "        env:",
  "          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}",
  "        run: |",
  "          node scripts/build-home-desk-module.mjs",
  "          node scripts/build-news-visual-receipts.mjs",
  "          node scripts/build-news-critique-packets.mjs",
  "          node scripts/build-candidate-artifact-manifest.mjs",
  "          node scripts/build-deploy-currency.mjs",
  "          node scripts/build-release-proof.mjs",
  "          node scripts/build-newsroom-run.mjs",
  "          node scripts/build-status-proof.mjs",
  "          node scripts/build-citation.mjs",
  "          node scripts/generate-sitemap.mjs",
  "          node scripts/generate-sitemap.mjs --check",
  "          node scripts/build-sitemap-page.mjs",
  "          node scripts/build-sitemap-page.mjs --check",
  "          node scripts/build-intent-map.mjs",
  "          node scripts/build-stats-surface.mjs",
  "          node scripts/build-intent-map.mjs --check",
  "          node scripts/build-stats-surface.mjs --check",
  "          node scripts/build-studio-timeline.mjs || echo \"::warning::studio-timeline rebuild skipped (GitHub API unavailable); feed left as committed\"",
  "          node scripts/build-studio-timeline.mjs --check"
].join('\n');
const DAILY_STEP = [
  "      - name: Enforce published cadence",
  "        if: always()",
  "        run: node scripts/build-news-freshness.mjs --check --require-daily"
].join('\n');
const SUMMARY_STEP = [
  "      - name: Slot summary",
  "        if: always()",
  "        run: |",
  "          echo \"### The Desk — ${{ steps.slot.outputs.edition }} slot\" >> \"$GITHUB_STEP_SUMMARY\"",
  "          echo \"\" >> \"$GITHUB_STEP_SUMMARY\"",
  "          echo \"- prepare: \\`${{ steps.prepare.outputs.status || 'skipped' }}\\`\" >> \"$GITHUB_STEP_SUMMARY\"",
  "          echo \"- author:  \\`${{ steps.author.outputs.status || 'skipped' }}\\`\" >> \"$GITHUB_STEP_SUMMARY\"",
  "          echo \"- art:     \\`${{ steps.art.outputs.status || 'skipped' }}\\`\" >> \"$GITHUB_STEP_SUMMARY\"",
  "          echo \"- promote: \\`${{ steps.promote.outputs.status || 'skipped' }}\\`\" >> \"$GITHUB_STEP_SUMMARY\"",
  "          echo \"\" >> \"$GITHUB_STEP_SUMMARY\"",
  "          echo \"A non-zero status is a dropped slot, not an incident — the next scheduled edition retries.\" >> \"$GITHUB_STEP_SUMMARY\""
].join('\n');

const normalize = source => stripShellComments(String(source).replaceAll('\r\n', '\n'))
  .split('\n').map(line => line.trimEnd()).filter(line => line.trim()).join('\n');

function sections(source) {
  const text = String(source).replaceAll('\r\n', '\n');
  if (/\t|^[ ]*<<:/m.test(text)) throw Error('Unsupported YAML indirection or indentation');
  const marker = '\njobs:\n', at = text.indexOf(marker);
  if (at < 0 || text.indexOf(marker, at + marker.length) >= 0) throw Error('Exactly one literal jobs mapping is required');
  const lines = text.slice(at + marker.length).split('\n'), starts = [];
  lines.forEach((line, i) => { const m = line.match(/^  ([a-z][a-z0-9_-]*):\s*$/); if (m) starts.push({ id: m[1], i }); });
  if (starts.length !== 3 || starts.map(s => s.id).join(',') !== 'author,publish,regenerate') throw Error('Unsupported immutable publication job layout');
  return Object.fromEntries(starts.map((s, k) => [s.id, lines.slice(s.i + 1, starts[k + 1]?.i ?? lines.length).join('\n')]));
}

function runBody(step) {
  const lines = step.split('\n'), start = lines.findIndex(line => /^        run: \|\s*$/.test(line));
  if (start < 0) return '';
  return lines.slice(start + 1).filter(line => !line.trim() || line.startsWith('          '))
    .map(line => line.slice(10)).join('\n');
}

export function verifyImmutableDeskPublication(source) {
  const executable = normalize(source);
  const applicable = /^\s*node scripts\/desk-publication-artifact\.mjs\s+--(?:capture|apply)\b/m.test(executable);
  if (!applicable) return { applicable: false, ok: false, errors: [] };
  const errors = [];
  try {
    const jobs = sections(source), blocks = stepBlocks(jobs.author);
    if (normalize(jobs.author.split('    steps:')[0]) !== AUTHOR_HEADER) errors.push('Author permissions and digest outputs must retain the reviewed read-only contract');
    if (normalize(jobs.publish) !== PUBLISH_JOB) errors.push('Publisher must retain exact hash-bound download/apply, source checkout, non-force CAS, race failure and lost-ack containment guards');
    if (normalize(jobs.regenerate) !== REGENERATE_JOB) errors.push('Regeneration must be separate, bounded and run the complete pipeline at current main');
    for (const [label, expected] of [['read-only author checkout', AUTHOR_CHECKOUT_STEP], ['capture', CAPTURE_STEP], ['upload', UPLOAD_STEP], ['gates', GATES_STEP], ['same-day guard', CADENCE_STEP]]) {
      if (blocks.filter(block => normalize(block) === expected).length !== 1) errors.push('Missing or weakened executable ' + label + ' step');
    }
    const gate = blocks.findIndex(b => normalize(b) === GATES_STEP), cadence = blocks.findIndex(b => normalize(b) === CADENCE_STEP), capture = blocks.findIndex(b => normalize(b) === CAPTURE_STEP), upload = blocks.findIndex(b => normalize(b) === UPLOAD_STEP);
    if (!(gate >= 0 && cadence > gate && capture > cadence && upload > capture)) errors.push('Capture/upload must follow successful actual editorial and freshness gates');
    // These are the actual existing post-gate steps, including the reviewed
    // derived-feed cascade and the final read-only summary. No unreviewed step
    // may mutate bytes between a gate, capture, upload or job completion.
    const expectedTail = [GATES_STEP, CASCADE_STEP, DAILY_STEP, CADENCE_STEP, CAPTURE_STEP, UPLOAD_STEP, SUMMARY_STEP];
    const actualTail = gate < 0 ? [] : blocks.slice(gate).map(normalize);
    if (JSON.stringify(actualTail) !== JSON.stringify(expectedTail)) errors.push('Unreviewed or reordered post-gate step: the complete gate-to-upload-and-summary sequence must remain exact');
    const authorCode = normalize(jobs.author);
    if (/\bgit\s+(?:commit|push|rebase|pull)\b|publish-push\.sh|gh workflow run/.test(authorCode)) errors.push('Read-only author cannot publish or dispatch');
  } catch (error) { errors.push(error.message); }
  return { applicable: true, ok: errors.length === 0, errors };
}

/** Used by the existing local-Git success/race/lost-ack tests as well as the
 * structural gate. Never execute a weakened or ambiguously extracted script. */
export function immutableDeskPublicationRunBody(source) {
  const verdict = verifyImmutableDeskPublication(source);
  if (!verdict.ok) throw Error('Invalid immutable Desk publication: ' + verdict.errors.join('; '));
  const blocks = stepBlocks(sections(source).publish), bodies = blocks.map(runBody).filter(body => /^if ! git push origin HEAD:main; then$/m.test(normalize(body)));
  if (bodies.length !== 1) throw Error('Exactly one verified CAS publication shell is required');
  return bodies[0];
}
