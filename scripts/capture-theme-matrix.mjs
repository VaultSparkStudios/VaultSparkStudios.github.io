#!/usr/bin/env node
/**
 * capture-theme-matrix.mjs — CANON-047 AI image-test harness (S303).
 *
 * Screenshots key pages in every shipped theme so a reviewing agent (or human)
 * can verify readability/contrast/atmosphere per theme before release. Output
 * goes to --out (default .cache/theme-matrix — NOT committed; the reviewed
 * verdict lands in docs/THEME_READABILITY_MATRIX.md).
 *
 * Usage:
 *   node scripts/capture-theme-matrix.mjs [--out <dir>] [--themes dark,light] [--routes /,/evidence/]
 *   Use --focus-selector '.desk-profile-feed .desk-profile-entry:first-child' to inspect a touched panel.
 *   Use --scroll-tiles for planned, overlapping viewport captures of every vertical
 *   region. --full-page remains available for diagnostics, but tall Chromium
 *   stitched images can repeat compositor tiles and cannot prove viewport pixels.
 *   Add --receipt --receipt-all to hash-bind every requested route/theme/viewport
 *   into docs/visual-qa/LATEST.json for a focused changed-surface review. Pass
 *   --reviewed-files <comma-separated filenames> only after directly inspecting
 *   those rendered files; unlisted captures remain explicitly automated-only.
 *   Originals and manifest are sealed under --out/runs/<unique-run-id>. To publish
 *   later, use --receipt-only --out <reported-run-directory>; stale inputs refuse.
 */
import fs from 'node:fs';
import {settleCaptureAnimations,validateRasterAnimationState} from './lib/capture-animation-state.mjs';
import http from 'node:http';
import path from 'node:path';
import url from 'node:url';
import { beginVisualCapture, createVisualCaptureDirectory, writeVisualCapture, sealVisualCapture, validateVisualCapture, publishVisualCapture } from './lib/visual-capture-provenance.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const arg = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };

const OUT_DIR = path.resolve(ROOT, arg('--out', '.cache/theme-matrix'));
const PORT = Number(arg('--port', '4179'));

const THEMES = arg('--themes', 'dark,light,ambient,warm,cool,lava,high-contrast').split(',');
// S341: `/proof/` was retired in S335 and 301s to `/evidence/#verify` (see _redirects).
// It stayed in this default for six sessions, and because the static server below is
// this tool's OWN server -- it does not apply `_redirects`, exactly like the preview
// before S340 taught it to -- every request 404'd and produced a BLANK PNG. All 14
// proof captures were byte-identical blanks (5625B desktop / 2739B mobile, the same
// size in all seven themes, which is the signature of "no content, theme irrelevant"),
// and `record-visual-review --all` certified them as manually reviewed every session.
// Third recurrence of the S338/S340 class: a route merge reaching one more consumer.
// The blank-capture guard below is what makes it non-silent next time.
const ROUTES = arg('--routes', '/,/games/,/membership/,/status/,/evidence/,/atlas/').split(',');
// S354: Git Bash rewrites a bare `/` argument into its install path
// (`C:/Program Files/Git/`), so every home capture navigated to an invalid URL.
// The blank-capture guard caught it only after 84 captures; refuse up front.
const badRoutes = ROUTES.filter((route) => !route.startsWith('/') || /^[A-Za-z]:[\\/]/.test(route) || /Program Files/i.test(route));
if (badRoutes.length) {
  console.error(`capture-theme-matrix: invalid --routes value(s): ${badRoutes.join(', ')}`);
  console.error('  every route must be a site path starting with "/". On Git Bash, run with MSYS_NO_PATHCONV=1 so "/" is not rewritten to a Windows path.');
  process.exit(2);
}
const VIEWPORT_PRESETS = [
  { name: 'desktop', width: 1366, height: 900 },
  { name: 'mobile-small', width: 360, height: 640 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'mobile-large', width: 430, height: 932 },
];
const requestedViewports = new Set(arg('--viewports', 'desktop,mobile').split(','));
const VIEWPORTS = VIEWPORT_PRESETS.filter((viewport) => requestedViewports.has(viewport.name));
const OPEN_NAV = argv.includes('--open-nav');
const FOCUS_CHANGED = argv.includes('--focus-changed');
const FOCUS_SELECTOR = arg('--focus-selector', null);
const FOCUS_FOOTER = argv.includes('--footer');
const FOCUS_DISPATCH = argv.includes('--dispatch');
const FOCUS_CHANGELOG_REACTIONS = argv.includes('--changelog-reactions');
const FULL_PAGE = argv.includes('--full-page');
const SCROLL_TILES = argv.includes('--scroll-tiles');
if (SCROLL_TILES && (FULL_PAGE || OPEN_NAV || FOCUS_CHANGED || FOCUS_SELECTOR || FOCUS_FOOTER || FOCUS_DISPATCH || FOCUS_CHANGELOG_REACTIONS)) {
  throw new Error('--scroll-tiles cannot be combined with full-page, focused or open-navigation states');
}
if (FULL_PAGE && (OPEN_NAV || FOCUS_CHANGED || FOCUS_SELECTOR || FOCUS_FOOTER || FOCUS_DISPATCH || FOCUS_CHANGELOG_REACTIONS)) {
  throw new Error('--full-page cannot be combined with a focused or open-navigation state');
}
// Explicit installed-browser selection avoids an implicit binary download. The
// default remains the committed Playwright runtime used by screenshot oracles.
const BROWSER_CHANNEL = arg('--browser-channel', null);
if (BROWSER_CHANNEL && !['chrome', 'msedge'].includes(BROWSER_CHANNEL)) throw new Error('Unsupported installed browser channel');

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'],
  ['.webp', 'image/webp'], ['.avif', 'image/avif'], ['.woff2', 'font/woff2'],
  ['.ndjson', 'application/x-ndjson'], ['.txt', 'text/plain; charset=utf-8'],
]);

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const reqPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
        let rel = reqPath.endsWith('/') ? reqPath + 'index.html' : reqPath;
        let abs = path.join(ROOT, rel);
        if (!abs.startsWith(ROOT) || !fs.existsSync(abs)) { res.writeHead(404); res.end(); return; }
        if (fs.statSync(abs).isDirectory()) abs = path.join(abs, 'index.html');
        if (!fs.existsSync(abs)) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'content-type': MIME.get(path.extname(abs)) || 'application/octet-stream' });
        res.end(fs.readFileSync(abs));
      } catch { res.writeHead(500); res.end(); }
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

const slug = (s) => s.replace(/\//g, '-').replace(/^-|-$/g, '') || 'home';

/** Planned before screenshots; no count is inferred from successful captures. */
export function planScrollTiles(documentHeight, viewportHeight, viewportWidth, occlusion) {
  if (![documentHeight, viewportHeight, viewportWidth].every(Number.isSafeInteger)
    || documentHeight < 1 || documentHeight > 100000 || viewportHeight <= 200 || viewportHeight > 3000
    || viewportWidth < 320 || viewportWidth > 3000) throw new Error('Invalid scroll-tile geometry');
  if (occlusion !== undefined && (!occlusion || ![occlusion.top, occlusion.bottom].every(value => Number.isFinite(value) && value >= 0))) throw new Error('Invalid scroll-tile occlusion');
  const edges = occlusion === undefined ? null : { top: Math.ceil(occlusion.top), bottom: Math.ceil(occlusion.bottom) };
  const overlap = 200 + (edges ? edges.top + edges.bottom : 0);
  if (viewportHeight <= overlap) throw new Error('Occlusion leaves no scroll-tile step');
  const last = Math.max(0, documentHeight - viewportHeight), offsets = [0];
  while (offsets.at(-1) < last) {
    if (offsets.length >= 250) throw new Error('Scroll-tile plan exceeds capture bound');
    offsets.push(Math.min(last, offsets.at(-1) + viewportHeight - overlap));
  }
  if (occlusion?.reservedColumns) {
    if (!Array.isArray(occlusion.witnessOffsets) || occlusion.witnessOffsets.some(y=>!Number.isSafeInteger(y)||y<0||y>last)) throw Error('Invalid reserved-column witnesses');
    offsets.splice(0,offsets.length,...[...new Set([...offsets,...occlusion.witnessOffsets])].sort((a,b)=>a-b));
    if(offsets.length>250)throw Error('Scroll-tile plan exceeds capture bound');
  }
  return { documentHeight, viewportHeight, viewportWidth, overlap, offsets, ...(edges ? { contentOverlap: 200, occlusion: edges, ...(occlusion.reservedColumns ? { reservedColumns: occlusion.reservedColumns, witnessOffsets: occlusion.witnessOffsets } : {}) } : {}) };
}

export function validateScrollTileMeasurement(plan, measurement, offset) {
  validateScrollTileOcclusion(plan, measurement);
  if (!measurement || ![measurement.scrollY, measurement.documentHeight, measurement.viewportHeight, measurement.viewportWidth, measurement.scrollWidth].every(Number.isSafeInteger)
    || Math.abs(measurement.documentHeight - plan.documentHeight) > 2
    || measurement.viewportHeight !== plan.viewportHeight || measurement.viewportWidth !== plan.viewportWidth
    || measurement.scrollWidth > plan.viewportWidth + 1 || measurement.scrollWidth < 1
    || Math.abs(measurement.scrollY - offset) > 2) throw new Error('Scroll-tile drift: ' + JSON.stringify({h:[plan.documentHeight,measurement?.documentHeight],y:[offset,measurement?.scrollY],w:[plan.viewportWidth,measurement?.scrollWidth],v:[plan.viewportHeight,measurement?.viewportHeight]}));
}

/** Validates the sealed adaptive matrix and every case's actual coverage. */
export function validateScrollTileCoverage(capturePlan, shots) {
  if (!capturePlan || capturePlan.mode !== 'scroll-tiles-v1' || !Array.isArray(shots) || !shots.length) throw new Error('Missing scroll-tile plan');
  const { routes, themes, viewports, cases } = capturePlan;
  for (const dimension of [routes, themes, viewports]) if (!Array.isArray(dimension) || !dimension.length || new Set(dimension).size !== dimension.length) throw new Error('Invalid scroll-tile matrix');
  if (!Array.isArray(cases) || cases.length !== routes.length * themes.length * viewports.length) throw new Error('Incomplete scroll-tile case plan');
  const key = row => `${row.route ?? row.page}|${row.theme}|${typeof row.viewport === 'string' ? row.viewport : row.viewportName}`;
  const expected = new Set(routes.flatMap(route => themes.flatMap(theme => viewports.map(viewport => `${route}|${theme}|${viewport}`))));
  const seen = new Set(); let plannedCaptures = 0;
  for (const row of cases) {
    const id = key(row);
    if (!expected.has(id) || seen.has(id)) throw new Error('Duplicate or foreign scroll-tile case');
    seen.add(id);
    const plan = planScrollTiles(row.plan?.documentHeight, row.plan?.viewportHeight, row.plan?.viewportWidth, row.plan?.occlusion ? {...row.plan.occlusion,...(row.plan.reservedColumns ? {reservedColumns:row.plan.reservedColumns,witnessOffsets:row.plan.witnessOffsets}: {})} : undefined);
    if (JSON.stringify(plan) !== JSON.stringify(row.plan)) throw new Error('Noncanonical scroll-tile plan');
    const tiles = shots.filter(shot => key(shot) === id);
    if (tiles.length !== plan.offsets.length) throw new Error('Missing or duplicate scroll tile');
    let prior = null;
    for (const [index, tile] of tiles.entries()) {
      if (tile.state !== 'scroll-tile' || tile.tileIndex !== index || tile.plannedOffset !== plan.offsets[index]) throw new Error('Unplanned scroll-tile state/order');
      validateScrollTileMeasurement(plan, tile.scroll, plan.offsets[index]);
      if (plan.occlusion) {
        validateScrollTileMeasurement(plan, tile.afterScroll, plan.offsets[index]);
        if (tile.afterScroll.scrollY !== tile.scroll.scrollY) throw new Error('Scroll position changed during tile capture');
      }
      if (index === 0 && tile.scroll.scrollY !== 0) throw new Error('First scroll tile must start at zero');
      if (prior !== null && (tile.scroll.scrollY <= prior || prior + plan.viewportHeight - tile.scroll.scrollY < plan.overlap)) throw new Error('Scroll-tile gap or insufficient overlap');
      if (plan.occlusion && index > 0) {
        const previous = tiles[index - 1].scroll;
        const exposedEnd = previous.scrollY + plan.viewportHeight - previous.occlusion.bottom;
        const exposedStart = tile.scroll.scrollY + tile.scroll.occlusion.top;
        if (exposedEnd - exposedStart < plan.contentOverlap) throw new Error('Scroll-tile content gap or insufficient visible overlap');
      }
      prior = tile.scroll.scrollY;
    }
    const last = tiles.at(-1).scroll;
    if (last.scrollY + last.viewportHeight < last.documentHeight) throw new Error('Final scroll tile does not reach bottom');
    if (plan.reservedColumns) validateReservedColumnCoverage(plan.reservedColumns, tiles.flatMap(tile=>[intersectReservedMeasurements(tile.scroll.occlusion.reservedColumns,tile.afterScroll.occlusion.reservedColumns)]));
    plannedCaptures += plan.offsets.length;
  }
  if (shots.some(shot => !expected.has(key(shot))) || shots.length !== plannedCaptures) throw new Error('Scroll-tile captures differ from planned matrix');
  return { plannedCaptures, completedCaptures: shots.length, plannedCases: cases.length };
}

export async function closeScrollTilePlan(geometry,observe){
  const legacy=planScrollTiles(geometry.documentHeight,geometry.viewportHeight,geometry.viewportWidth);
  let plan=legacy,columns=null;const max={top:0,bottom:0},occlusionWalk=[],witnesses=new Set(legacy.offsets);
  for(let pass=0;pass<8;pass++){
    for(const offset of plan.offsets){
      if(occlusionWalk.length>=2000)throw Error('Preplan observations exceed bound');
      const measured=await observe(offset);validateScrollTileMeasurement(legacy,measured,offset);
      if(!measured.occlusion||![measured.occlusion.top,measured.occlusion.bottom].every(x=>Number.isFinite(x)&&x>=0))throw Error('Missing preplan occlusion');
      const found=measured.occlusion.reservedColumns||[];
      if(columns===null)columns=found.map(({key,left,right,height,peerLeft,peerRight,leadingRow})=>({key,left,right,height,peerLeft,peerRight,...(leadingRow?{leadingRow:Object.fromEntries(['key','left','right','height','position','gridColumnStart','gridColumnEnd'].map(k=>[k,leadingRow[k]]))}: {})}));
      if(columns.length)validateReservedColumnGeometry(columns,found);else if(found.length)throw Error('Reserved column appeared during preplan');
      max.top=Math.max(max.top,measured.occlusion.top);max.bottom=Math.max(max.bottom,measured.occlusion.bottom);
      witnesses.add(offset);occlusionWalk.push({...measured,preplanPass:pass});
    }
    if(columns.length)validateReservedColumnCoverage(columns,occlusionWalk.map(m=>m.occlusion.reservedColumns));
    const next=planScrollTiles(geometry.documentHeight,geometry.viewportHeight,geometry.viewportWidth,{...max,...(columns.length?{reservedColumns:columns,witnessOffsets:[...witnesses].sort((a,b)=>a-b)}:{})});
    if(JSON.stringify(next)===JSON.stringify(plan))return{plan:next,occlusionWalk};
    plan=next;
  }
  throw Error('Preplan occlusion did not close over final raster offsets');
}
export function validateReservedColumnGeometry(expected,actual){
  if(!Array.isArray(expected)||!expected.length||expected.length>16||!Array.isArray(actual)||actual.length!==expected.length||new Set(expected.map(x=>x.key)).size!==expected.length||new Set(actual.map(x=>x.key)).size!==actual.length)throw Error('Reserved column inventory changed');
  for(const e of expected){const a=actual.find(x=>x.key===e.key);
    if(!a||['left','right','height','peerLeft','peerRight'].some(k=>!Number.isFinite(a[k])||a[k]!==e[k])||a.height<=0||a.left<0||a.right<=a.left||!(a.right<=a.peerLeft||a.peerRight<=a.left))throw Error('Reserved column geometry changed or overlaps sibling');
    if(Boolean(e.leadingRow)!==Boolean(a.leadingRow))throw Error('Reserved leading row inventory changed');
    if(e.leadingRow){const row=a.leadingRow;
      if(['key','left','right','height','position','gridColumnStart','gridColumnEnd'].some(k=>row[k]!==e.leadingRow[k])||![row.top,row.bottom,a.rectTop].every(Number.isFinite)||row.bottom>a.rectTop||!['static','relative'].includes(row.position)||row.gridColumnStart!=='1'||row.gridColumnEnd!=='-1')throw Error('Reserved leading row changed or overlaps sidebar');
    }
  }
}
export function intersectReservedMeasurements(before,after){
  validateReservedColumnGeometry(before,after);
  return before.map(b=>{const a=after.find(x=>x.key===b.key);return {...b,exposedStart:Math.max(b.exposedStart,a.exposedStart),exposedEnd:Math.min(b.exposedEnd,a.exposedEnd)};});
}
export function validateReservedColumnCoverage(expected,observations){
  if(!Array.isArray(observations)||!observations.length)throw Error('Missing reserved-column exposure');
  for(const rows of observations)validateReservedColumnGeometry(expected,rows);
  for(const column of expected){
    const intervals=observations.map(rows=>rows.find(x=>x.key===column.key)).map(row=>{
      if(![row.exposedStart,row.exposedEnd].every(Number.isFinite)||row.exposedStart<0||row.exposedEnd>column.height)throw Error('Invalid reserved-column exposure');
      return [row.exposedStart,row.exposedEnd];
    }).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
    let end=0;for(const [start,next] of intervals){if(start>end)throw Error('Reserved column has unexposed content');end=Math.max(end,next);}
    if(end<column.height)throw Error('Reserved column bottom was never exposed');
  }
}


/** Browser-side geometry only: fixed overlays and sticky elements actually pinned
 * to their configured viewport edge. Ordinary in-flow content is never admitted.
 * Visible descendant overflow is included, after ancestor clipping. */
export function measureScrollTileOcclusion() {
  const nodes = [...document.querySelectorAll('*')];
  if (nodes.length > 30000) throw new Error('Occlusion DOM exceeds bound');
  const vh = innerHeight, vw = innerWidth;
  const visibleRect = element => {
    let rect = element.getBoundingClientRect();
    let box = { top: Math.max(0, rect.top), bottom: Math.min(vh, rect.bottom), left: Math.max(0, rect.left), right: Math.min(vw, rect.right) };
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) return null;
      if (ancestor !== element) {
        rect = ancestor.getBoundingClientRect();
        if (/(hidden|clip|auto|scroll)/.test(style.overflowY)) { box.top = Math.max(box.top, rect.top); box.bottom = Math.min(box.bottom, rect.bottom); }
        if (/(hidden|clip|auto|scroll)/.test(style.overflowX)) { box.left = Math.max(box.left, rect.left); box.right = Math.min(box.right, rect.right); }
      }
    }
    return box.bottom > box.top && box.right > box.left ? box : null;
  };
  // A sticky direct child of a two-column grid can reserve its own column.
  // Every sibling and descendant must stay horizontally disjoint/contained.
  // It is never discarded: its own local vertical exposure is separately proved.
  const reservedNodes=new Set(),reservedColumns=[];
  for(const element of nodes){
    const style=getComputedStyle(element),parent=element.parentElement;
    if(style.position!=='sticky'||!parent||getComputedStyle(parent).display!=='grid'||![2,3].includes(parent.children.length))continue;
    const siblings=[...parent.children],r=element.getBoundingClientRect();
    const peers=siblings.filter(x=>x!==element),disjoint=peers.filter(node=>{const box=node.getBoundingClientRect();return r.right<=box.left||box.right<=r.left;});
    if(disjoint.length!==1)continue;
    const other=disjoint[0],o=other.getBoundingClientRect(),leading=peers.find(node=>node!==other)||null;
    let leadingRow;
    if(leading){const ls=getComputedStyle(leading),lr=leading.getBoundingClientRect(),pr=parent.getBoundingClientRect();
      if(ls.gridColumnStart!=='1'||ls.gridColumnEnd!=='-1'||!['static','relative'].includes(ls.position)||lr.width<=0||lr.height<=0||lr.bottom>r.top||lr.left<0||lr.right>vw||lr.left!==pr.left||lr.right!==pr.right)continue;
      leadingRow={key:'grid-'+nodes.indexOf(parent)+'-child-'+siblings.indexOf(leading),left:lr.left,right:lr.right,height:lr.height,position:ls.position,gridColumnStart:ls.gridColumnStart,gridColumnEnd:ls.gridColumnEnd,top:lr.top,bottom:lr.bottom};
    }
    if(r.width<=0||r.height<=0||r.left<0||r.right>vw||!(r.right<=o.left||o.right<=r.left))continue;
    if(!['static','relative'].includes(getComputedStyle(other).position)||element.scrollHeight>r.height+1||element.scrollWidth>r.width+1)continue;
    let contained=true;
    for(const child of element.querySelectorAll('*')){
      const cs=getComputedStyle(child);if(cs.display==='none'||cs.visibility!=='visible')continue;
      const cr=child.getBoundingClientRect();
      if(cr.width&&cr.height&&(cr.left<r.left||cr.right>r.right||cr.top<r.top||cr.bottom>r.bottom)){contained=false;break;}
    }
    if(!contained)continue;
    // Grid tracks alone do not clip a sibling's positioned or painted overflow.
    // Refuse the exception unless every visible peer box stays inside its track;
    // generated/positioned content is conservatively unproved, never ignored.
    const clippedByTrack=(node,track,pseudo=false,vertical=false)=>{
      const bounds=track.getBoundingClientRect(),ns=getComputedStyle(node);
      if(ns.position==='fixed')return false;
      let containingBlockKnown=pseudo?ns.position!=='static':ns.position!=='absolute';
      for(let clip=pseudo?node:node.parentElement;clip;clip=clip.parentElement){
        const cs=getComputedStyle(clip),cr=clip.getBoundingClientRect();
        if(cs.position!=='static')containingBlockKnown=true;
        if(containingBlockKnown&&/^(hidden|clip)$/.test(cs.overflowX)&&(!vertical||/^(hidden|clip)$/.test(cs.overflowY))&&cr.left>=bounds.left&&cr.right<=bounds.right&&(!vertical||(cr.top>=bounds.top&&cr.bottom<=bounds.bottom)))return true;
        if(clip===track)break;
      }
      return false;
    };
    const generatedBox=(node,track=other,vertical=false)=>['::before','::after'].some(pseudo=>{
      const ps=getComputedStyle(node,pseudo),painted=ps.display!=='none'&&ps.visibility==='visible'&&Number(ps.opacity)!==0&&typeof ps.content==='string'&&!['none','normal'].includes(ps.content);
      return painted&&(ps.position!=='absolute'||!clippedByTrack(node,track,true,vertical));
    });
    for(const child of [other,...other.querySelectorAll('*')]){
      const cs=getComputedStyle(child);if(cs.display==='none'||cs.visibility!=='visible'||Number(cs.opacity)===0)continue;
      const cr=child.getBoundingClientRect();
      if((!['static','relative'].includes(cs.position)&&!clippedByTrack(child,other))||generatedBox(child)||(cr.width&&cr.height&&(cr.left<o.left||cr.right>o.right)&&!clippedByTrack(child,other))){contained=false;break;}
    }
    if(!contained||[element,...element.querySelectorAll('*')].some(node=>generatedBox(node,element,true)))continue;
    if(leading){const lr=leading.getBoundingClientRect();
      for(const child of [leading,...leading.querySelectorAll('*')]){const cs=getComputedStyle(child);if(cs.display==='none'||cs.visibility!=='visible'||Number(cs.opacity)===0)continue;const cr=child.getBoundingClientRect();
        if((!['static','relative'].includes(cs.position)&&!clippedByTrack(child,leading,false,true))||generatedBox(child,leading,true)||(cr.width&&cr.height&&(cr.left<lr.left||cr.right>lr.right||cr.top<lr.top||cr.bottom>lr.bottom)&&!clippedByTrack(child,leading,false,true))){contained=false;break;}
      }
      if(!contained)continue;
    }
    const key='grid-'+nodes.indexOf(parent)+'-child-'+siblings.indexOf(element);
    const visible=visibleRect(element);
    reservedNodes.add(element);reservedColumns.push({key,left:r.left,right:r.right,height:r.height,rectTop:r.top,visibleTop:visible?.top??r.top,visibleBottom:visible?.bottom??r.top,peerLeft:o.left,peerRight:o.right,...(leadingRow?{leadingRow}: {})});
  }
  let top = 0, bottom = 0;
  const sources = [];
  for (const element of nodes) {
    const style = getComputedStyle(element);
    if (style.position !== 'fixed' && style.position !== 'sticky') continue;
    if(reservedNodes.has(element))continue;
    const rect = element.getBoundingClientRect(), own = visibleRect(element);
    if (!own) continue;
    const topOffset = style.top === 'auto' ? null : Number.parseFloat(style.top);
    const bottomOffset = style.bottom === 'auto' ? null : Number.parseFloat(style.bottom);
    // Sticky elements still flowing through the middle of the page are not overlays.
    // getComputedStyle resolves the auto inset of fixed boxes to used pixels in
    // Chromium. Classify those by the nearest viewport edge, not resolved insets.
    const atTop = style.position === 'fixed' ? rect.top <= vh - rect.bottom
      : topOffset !== null && Number.isFinite(topOffset) && Math.abs(rect.top - topOffset) <= 1;
    const atBottom = style.position === 'fixed' ? vh - rect.bottom <= rect.top
      : bottomOffset !== null && Number.isFinite(bottomOffset) && Math.abs(vh - rect.bottom - bottomOffset) <= 1;
    if (!atTop && !atBottom) continue;
    let edgeTop = own.top, edgeBottom = own.bottom;
    for (const child of element.querySelectorAll('*')) {
      const box = visibleRect(child);
      if (box) { edgeTop = Math.min(edgeTop, box.top); edgeBottom = Math.max(edgeBottom, box.bottom); }
    }
    // A stretched fixed overlay is intentionally refused by the planner rather
    // than silently claiming the content behind it was visible.
    if (atTop) top = Math.max(top, edgeBottom);
    if (atBottom) bottom = Math.max(bottom, vh - edgeTop);
    sources.push({ tag: element.tagName.toLowerCase(), id: element.id || null, position: style.position, top: atTop ? edgeBottom : 0, bottom: atBottom ? vh - edgeTop : 0 });
  }
  for(const column of reservedColumns){
    column.exposedStart=Math.min(column.height,Math.max(0,Math.max(top,column.visibleTop)-column.rectTop));
    column.exposedEnd=Math.max(0,Math.min(column.height,Math.min(vh-bottom,column.visibleBottom)-column.rectTop));
    if(column.exposedEnd<column.exposedStart)column.exposedEnd=column.exposedStart;
  }
  return { top, bottom, sources, ...(reservedColumns.length ? {reservedColumns}: {}) };
}

export function validateScrollTileOcclusion(plan, measurement) {
  if (!plan.occlusion) return; // Historical three-argument plans remain valid.
  const actual = measurement?.occlusion;
  if (!actual || ![actual.top, actual.bottom].every(value => Number.isFinite(value) && value >= 0)
    || actual.top > plan.occlusion.top || actual.bottom > plan.occlusion.bottom) throw new Error('Scroll-tile occlusion grew beyond plan');
  if(plan.reservedColumns) validateReservedColumnGeometry(plan.reservedColumns,actual.reservedColumns);
  else if(actual.reservedColumns?.length) throw Error('Unplanned reserved column');
}

/** Animation-driven overlay descendants must not prevent layout settlement.
 * Occlusion remains measured independently in the walk and every tile. */
export function scrollTileLayoutKey(measurement) {
  const { scrollY, documentHeight, viewportHeight, viewportWidth, scrollWidth } = measurement;
  return JSON.stringify({ scrollY, documentHeight, viewportHeight, viewportWidth, scrollWidth });
}

/** The publication writer uses this exact projection. Legacy captures without
 * afterScroll keep their original shape; measured plans require it in validation. */
export function serializeScrollTileState(shot) {
  return { tileIndex: shot.tileIndex, plannedOffset: shot.plannedOffset, scroll: shot.scroll,
    ...(shot.afterScroll === undefined ? {} : { afterScroll: shot.afterScroll }) };
}

function homeIdleSources() {
  const source = fs.readFileSync(path.join(ROOT, 'assets/home-idle-loader.js'), 'utf8');
  const block = source.match(/const scripts\s*=\s*\[([\s\S]*?)\];/);
  if (!block) throw new Error('Homepage idle-loader source contract unavailable');
  const paths = [...block[1].matchAll(/['"](\/assets\/[^'"\s]+\.js)['"]/g)].map(match => match[1]);
  if (!paths.length || paths.length > 32 || new Set(paths).size !== paths.length) throw new Error('Homepage idle-loader source list invalid');
  return paths;
}

function captureSourceFiles(routes) {
  return [
    'scripts/lib/capture-animation-state.mjs', 'assets/turnstile.js', 'assets/style.css', 'assets/rank-projector.js', 'assets/page-sigil.js', 'assets/rank-orb.js', 'assets/vault-genome-strip.js',
    'assets/studio-pages.css', 'assets/contact-page.js', 'assets/report-content.js', 'assets/vault-cta.js',
    'assets/nav-sheet.js', 'assets/nav-toggle.js', 'assets/theme-toggle.js', 'vault-member/age-screen.js',
    'assets/adaptive-cta.js', 'assets/membership-proof-loop.js',
    'assets/telemetry-matrix.js', 'assets/membership-idle-loader.js',
    'assets/membership-access.js', 'assets/live-proof.js', 'assets/vault-rank-bar.js',
    'assets/rank-economy-simulator.js', 'data/rank-economy.json', 'assets/showcase-spine.js',
    'assets/member-voices.js', 'data/member-voices.json', 'assets/supabase-public.js',
    'assets/public-intelligence.js', 'api/public-intelligence.json', 'api/membership-tiers.json',
    'assets/studio-pulse-live.js', 'assets/honest-traction-scoreboard.js', 'assets/sealed-vault-row.js',
    'assets/notify-me.js', 'vault-member/account-data.js', 'vault-member/account-data.css', 'vault-member/portal-settings.js',
    'assets/project-waitlist.css', 'assets/project-waitlist-confirm.js',
    ...(routes.includes('/') && fs.existsSync(path.join(ROOT, 'assets/home-idle-loader.js')) ? ['assets/home-idle-loader.js', ...homeIdleSources().map(file => file.slice(1))] : []),
    'assets/news-desk.css', 'assets/desk-presence.js', 'scripts/generate-news-pages.mjs',
    ...fs.readdirSync(path.join(ROOT, 'assets', 'desk-personas'))
      .filter((file) => file.endsWith('.webp'))
      .map((file) => `assets/desk-personas/${file}`),
    'scripts/build-news-desk.mjs', 'scripts/lib/news-desk.mjs', 'scripts/lib/news-memes.mjs',
    'assets/cookie-consent.js', 'assets/pwa-install.js', 'assets/ambient-loader.js', 'assets/changelog-reactions.js',
    'assets/exit-intent.js', 'assets/visit-depth.js', 'assets/returning-visitor-digest.js',
    'assets/journey-conductor.js', 'vault-member/portal-auth.js',
    'vault-member/portal-dashboard.js', 'vault-member/portal-init.js',
    'scripts/check-attention-surface-contract.mjs', 'tests/attention-surfaces.spec.js',
    'data/news-desk/days/2026-08-21.json', 'data/news-desk/days/2026-08-22.json', 'data/news-desk/days/2026-08-23.json',
    'assets/og/news/2026-08-22--from-atari-to-eve-online-building-on-15-years--meme.png',
    'assets/og/news/2026-08-22--from-atari-to-eve-online-building-on-15-years--meme.webp',
    'assets/og/news/2026-08-22--from-atari-to-eve-online-building-on-15-years--meme.avif',
    'assets/og/news/2026-08-23--from-atari-to-eve-online-building-on-15-years--meme.png',
    'assets/og/news/2026-08-23--from-atari-to-eve-online-building-on-15-years--meme.webp',
    'assets/og/news/2026-08-23--from-atari-to-eve-online-building-on-15-years--meme.avif',
    ...fs.readdirSync(path.join(ROOT, 'assets', 'og', 'news'))
      .filter((file) => /--meme--(?:640\.(?:avif|webp)|128\.avif)$/.test(file))
      .map((file) => `assets/og/news/${file}`),
    'vault-member/portal.css',
    'scripts/build-deploy-currency.mjs', 'scripts/check-status-feed-field-contract.mjs',
    'scripts/capture-theme-matrix.mjs', 'scripts/lib/visual-capture-provenance.mjs', 'scripts/check-visual-review-receipt.mjs',
    ...routes.map((route) => route === '/' ? 'index.html' : `${route.slice(1)}index.html`),
  ].filter((file) => fs.existsSync(path.join(ROOT, file)));
}

async function main() {
  const { chromium } = await import('@playwright/test');
  const files = captureSourceFiles(ROUTES);
  const provenance = beginVisualCapture(ROOT, files, 'scripts/capture-theme-matrix.mjs');
  const runDir = createVisualCaptureDirectory(ROOT, OUT_DIR, provenance);
  const server = await serve();
  const browser = await chromium.launch(BROWSER_CHANNEL ? { channel: BROWSER_CHANNEL } : {});
  const browserRuntime = { channel: BROWSER_CHANNEL || 'playwright-chromium', version: browser.version() };
  const manifest = [];
  const capturePlan = SCROLL_TILES ? { mode: 'scroll-tiles-v1', routes: ROUTES, themes: THEMES, viewports: VIEWPORTS.map(viewport => viewport.name), cases: [] } : null;
  const failures = [];
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
      // Theme is applied by the head boot script from localStorage before paint.
      await context.addInitScript((t) => {
        try {
          localStorage.setItem('vs_theme', t);
          localStorage.setItem('vs_cookie_consent', 'declined');
        } catch {}
      }, theme);
      for (const route of ROUTES) {
        const page = await context.newPage();
        try {
          // 'load' not 'networkidle': several pages poll feeds forever.
          const response = await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'load', timeout: 30000 });
          await page.waitForTimeout(600);
          const observedTheme = await page.evaluate(() => ({
            stored: localStorage.getItem('vs_theme'),
            root: document.documentElement.dataset.theme,
            body: document.body.dataset.theme,
          }));
          if (observedTheme.stored !== theme || observedTheme.root !== theme || observedTheme.body !== theme) {
            throw new Error(`Theme mismatch: requested ${theme}, observed ${JSON.stringify(observedTheme)}`);
          }

          // S341 blank-capture guard. A screenshot of nothing is not evidence, but it
          // IS a PNG, so it flows into the manifest and `record-visual-review --all`
          // certifies it as reviewed like any other. That is how 14 blank renders sat
          // inside a CANON-053 receipt for six sessions. Refuse to write one: a route
          // that stops rendering must break the capture, not quietly pass through it.
          const status = response?.status?.() ?? 0;
          if (status >= 400) throw new Error(`route returned HTTP ${status} — retired or moved? check _redirects`);
          const visibleText = await page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim().length);
          if (visibleText < 200) {
            throw new Error(`rendered only ${visibleText} chars of visible text — blank/near-blank capture refused`);
          }
          if (OPEN_NAV) {
            await page.locator('#hamburger').dispatchEvent('click');
            await page.locator('.vs-nav-sheet.open').waitFor({ state: 'visible', timeout: 5000 });
          }
          if (FOCUS_FOOTER) {
            const footer = page.locator('footer.site-footer');
            await footer.waitFor({ state: 'visible', timeout: 5000 });
            await footer.scrollIntoViewIfNeeded();
            await page.waitForTimeout(200);
          }
          if (FOCUS_CHANGELOG_REACTIONS) {
            if (route !== '/changelog/') throw new Error('--changelog-reactions requires /changelog/');
            const phases = page.locator('.cl-phase');
            const phaseCount = await phases.count();
            const initialMounted = await page.locator('.cl-phase .vs-cr').count();
            if (initialMounted >= phaseCount) {
              throw new Error(`reaction hydration not bounded at first viewport (${initialMounted}/${phaseCount} mounted)`);
            }
            const target = phases.nth(Math.max(0, Math.min(8, (await phases.count()) - 1)));
            await target.scrollIntoViewIfNeeded();
            await target.locator('.vs-cr').waitFor({ state: 'visible', timeout: 5000 });
            await page.waitForTimeout(200);
          }
          const changedSelector = {
            '/': '.hero-showcase',
            '/news/directors-report/': '[data-reader-editorial-actions]',
            '/vault-member/': '.auth-card',
            '/studio/': '#roadmap .two-col',
            '/press/': '.press-grid',
            '/ignis/': '.ignis-caps-grid',
            '/status/': '#liveSignalsGrid',
            '/news/': '.desk-story-card[href="/news/2026-08-22/from-atari-to-eve-online-building-on-15-years/"]',
          }[route] || (route.startsWith('/news/') ? '.desk-critique-link' : null);
          const focusSelector = FOCUS_SELECTOR || (FOCUS_DISPATCH ? '.desk-dispatch:has(form[data-dispatch])' : FOCUS_CHANGED ? changedSelector : null);
          if (focusSelector) {
            const focus = page.locator(focusSelector);
            await focus.waitFor({ state: 'visible', timeout: 5000 });
            if (FOCUS_DISPATCH) {
              // Settle long-article scrolling before measuring the complete signup section.
              await page.addStyleTag({ content: 'html, body { scroll-behavior: auto !important; }' });
              await page.evaluate(() => document.fonts.ready);
              await focus.evaluate((node) => node.scrollIntoView({ behavior: 'instant', block: 'center' }));
              let previous = null;
              let stable = 0;
              for (let attempt = 0; attempt < 30 && stable < 3; attempt += 1) {
                await page.waitForTimeout(100);
                const bounds = await focus.boundingBox();
                if (!bounds) throw new Error('Dispatch section lost its rendered bounds');
                const current = JSON.stringify(bounds);
                stable = current === previous ? stable + 1 : 0;
                previous = current;
              }
              if (stable < 3) throw new Error('Dispatch layout did not settle before capture');
            }
            const images = focus.locator('img');
            for (let index = 0; index < await images.count(); index += 1) {
              await images.nth(index).evaluate(async (image) => {
                image.loading = 'eager';
                if (!image.complete) await new Promise((resolve) => image.addEventListener('load', resolve, { once: true }));
                await image.decode().catch(() => {});
              });
            }
          }
          if (FULL_PAGE || SCROLL_TILES) {
            // Visit every vertical region so lazy images and intersection-driven
            // sections render before the full-page image is taken.
            await page.evaluate(async () => {
              const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
              document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important');
              document.body.style.setProperty('scroll-behavior', 'auto', 'important');
              let top = 0;
              for (let step = 0; step < 250; step++) {
                const height = document.documentElement.scrollHeight;
                if (height > 100000) throw new Error('Full-page height exceeds reviewed capture bound');
                window.scrollTo(0, top);
                await pause(75);
                if (top + innerHeight >= document.documentElement.scrollHeight) {
                  window.scrollTo(0, 0);
                  await pause(150);
                  return;
                }
                top += Math.max(200, innerHeight - 100);
              }
              throw new Error('Full-page scrolling did not reach the final region');
            });
          }
          if (SCROLL_TILES) {
            // The signed-out membership bar appears on a delayed deadline and
            // reserves its wrapped height. Plan only after that real state
            // settles, so short pages cannot lose their footer mid-capture.
            if (await page.locator('script[src*="/vault-cta"]').count()) {
              await page.waitForFunction(() => {
                const dismissed = Number(localStorage.getItem('vs_cta_dismissed'));
                return !!document.getElementById('vs-cta-bar') ||
                  (dismissed > 0 && Date.now() - dismissed < 86400000);
              }, null, { timeout: 20000 });
            }
            if (route === '/membership/') {
              await page.waitForFunction(() =>
                !!document.querySelector('[data-telemetry-matrix] .telemetry-matrix-shell'),
              null, { timeout: 20000 });
              await page.waitForFunction(() =>
                ['[data-member-voices]','[data-member-outcomes]','[data-rank-distribution]'].every(selector =>
                  ['ready','empty','unavailable'].includes(document.querySelector(selector)?.dataset.state)),
              null, { timeout: 20000 });
            }
            if (route === '/') {
              // The real homepage starts its idle queue 1.2s after the first
              // scroll. A short geometry plateau can precede those modules.
              // Observe completion of their actual source-declared resources;
              // do not hide their content or accept a changing height.
              await page.waitForFunction(expected => {
                const canonical = value => new URL(value, location.href).pathname.replace(/\.shell-[a-f0-9]+\.js$/, '.js');
                const scripts = new Set([...document.scripts].filter(script => script.src).map(script => canonical(script.src)));
                const completed = new Set(performance.getEntriesByType('resource').map(entry => canonical(entry.name)));
                return expected.every(file => scripts.has(file) && completed.has(file));
              }, homeIdleSources(), { timeout: 20000 });
            }
            await page.evaluate(() => document.fonts.ready);
            if (route === '/') {
              // Source-declared idle modules can mount scroll-observed panels
              // only after the initial activation walk has already finished.
              // Require two complete subsequent walks with stable total height.
              await page.evaluate(async () => {
                const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
                let stable = 0;
                for (let pass = 0; pass < 4 && stable < 2; pass++) {
                  const before = document.documentElement.scrollHeight;
                  if (before > 100000) throw new Error('Homepage activation exceeds height bound');
                  let reached = false;
                  for (let top = 0, step = 0; step < 250; step++, top += Math.max(200, innerHeight - 100)) {
                    scrollTo(0, top);
                    await pause(150);
                    if (top + innerHeight >= document.documentElement.scrollHeight) { reached = true; break; }
                  }
                  if (!reached) throw new Error('Homepage activation walk incomplete');
                  scrollTo(0, 0);
                  await pause(400);
                  stable = Math.abs(document.documentElement.scrollHeight - before) <= 2 ? stable + 1 : 0;
                }
                if (stable < 2) throw new Error('Homepage idle panels did not settle across activation walks');
              });
            }
            const measure = async ({ preRaster = true } = {}) => { const animationCaptureState = await page.evaluate(settleCaptureAnimations, { resettleLateFinite: preRaster }); return ({ animationCaptureState,
              ...await page.evaluate(() => ({ scrollY: window.scrollY, documentHeight: document.documentElement.scrollHeight,
                viewportHeight: innerHeight, viewportWidth: innerWidth, scrollWidth: document.documentElement.scrollWidth })),
              occlusion: await page.evaluate(measureScrollTileOcclusion)
            }); };
            // Require a settled height before fixing the adaptive plan.
            let previous = null, stable = 0, geometry;
            for (let attempt = 0; attempt < 30 && stable < 3; attempt++) {
              await page.waitForTimeout(100); geometry = await measure();
              const value = scrollTileLayoutKey(geometry); stable = value === previous ? stable + 1 : 0; previous = value;
            }
            if (stable < 3) throw new Error('Scroll-tile layout did not settle before planning');
            // Close over the actual newly proposed raster offsets: position-
            // dependent fixed controls can yield at legacy offsets and reappear
            // at the denser content-overlap offsets. No fixed UI is ignored.
            const closed=await closeScrollTilePlan(geometry,async offset=>{
              await page.evaluate(y=>scrollTo({top:y,left:0,behavior:'instant'}),offset);
              await page.waitForTimeout(150);return measure();
            });
            const plan=closed.plan,occlusionWalk=closed.occlusionWalk;
            await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
            await page.waitForTimeout(150);geometry=await measure();
            validateScrollTileMeasurement(plan, geometry, 0);
            capturePlan.cases.push({ route, theme, viewport: viewport.name, plan, occlusionWalk });
            for (const [tileIndex, offset] of plan.offsets.entries()) {
              const target = tileIndex === plan.offsets.length - 1 ? Math.max(0, (await measure()).documentHeight - plan.viewportHeight) : offset;
              await page.evaluate(y => window.scrollTo({ top: y, left: 0, behavior: 'instant' }), target);
              await page.waitForTimeout(150);
              const scroll = await measure(); validateScrollTileMeasurement(plan, scroll, offset);
              const pixels = await page.screenshot({ animations: 'allow', fullPage: false });
              const after = await measure({ preRaster: false }); validateScrollTileMeasurement(plan, after, offset);validateRasterAnimationState(scroll,after);
              if (after.scrollY !== scroll.scrollY) throw new Error('Scroll position changed during tile capture');
              if (tileIndex === plan.offsets.length - 1 && after.scrollY + after.viewportHeight < after.documentHeight) throw new Error('Final tile changed before reaching bottom');
              const file = `${slug(route)}--${theme}--${viewport.name}--scroll-tile-y${scroll.scrollY}.png`;
              const sha256 = writeVisualCapture(path.join(runDir, file), pixels);
              manifest.push({ route, theme, observedTheme, capturedAt: new Date().toISOString(), viewport: viewport.name,
                state: 'scroll-tile', tileIndex, plannedOffset: offset, scroll, afterScroll: after, file, sha256 });
              console.log(`  ✓ ${file}`);
            }
            continue;
          }
          const stateSuffix = OPEN_NAV ? '--nav-open' : FOCUS_FOOTER ? '--footer' : FOCUS_CHANGELOG_REACTIONS ? '--changelog-reactions' : focusSelector ? '--changed-surface' : FULL_PAGE ? '--full-page' : '';
          const file = `${slug(route)}--${theme}--${viewport.name}${stateSuffix}.png`;
          let pixels;
          if (FOCUS_FOOTER) pixels = await page.locator('footer.site-footer').screenshot({ animations: 'disabled' });
          else if (FOCUS_CHANGELOG_REACTIONS) pixels = await page.locator('.cl-phase').nth(Math.max(0, Math.min(8, (await page.locator('.cl-phase').count()) - 1))).screenshot({ animations: 'disabled' });
          else if (focusSelector) pixels = await page.locator(focusSelector).screenshot({ animations: 'disabled' });
          else pixels = await page.screenshot({ animations: 'disabled', fullPage: FULL_PAGE });
          const sha256 = writeVisualCapture(path.join(runDir, file), pixels);
          manifest.push({ route, theme, observedTheme, capturedAt: new Date().toISOString(), viewport: viewport.name, state: OPEN_NAV ? 'nav-open' : FOCUS_FOOTER ? 'footer' : FOCUS_CHANGELOG_REACTIONS ? 'changelog-reactions' : focusSelector ? 'changed-surface' : FULL_PAGE ? 'full-page' : 'page', file, sha256 });
          console.log(`  ✓ ${file}`);
        } catch (error) {
          // S341: count it. A skipped capture used to shrink the receipt silently,
          // so a route that stopped rendering produced a SMALLER set of "fully
          // reviewed" captures rather than a failure.
          failures.push(`${route} ${theme} ${viewport.name}: ${String(error.message).slice(0, 120)}`);
          console.error(`  ✗ ${route} ${theme} ${viewport.name}: ${String(error.message).slice(0, 120)}`);
        } finally {
          await page.close();
        }
      }
      // New context per theme keeps localStorage init scripts from stacking.
      await context.close();
    }
  }
  await browser.close();
  server.close();
  console.log(`capture-theme-matrix: ${manifest.length} screenshot(s) → ${runDir}`);
  if (failures.length) {
    console.error(`capture-theme-matrix: ${failures.length} capture(s) FAILED — the receipt would be incomplete:`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error('  A missing capture is not a smaller review; it is an unreviewed surface. Fix the route, then re-run.');
    process.exitCode = 1;
    return;
  }
  if (SCROLL_TILES) validateScrollTileCoverage(capturePlan, manifest);
  const sealed = sealVisualCapture(ROOT, runDir, provenance, manifest, captureSourceFiles(ROUTES), capturePlan ? { capturePlan } : undefined);
  fs.writeFileSync(path.join(runDir, 'browser-runtime.json'), JSON.stringify(browserRuntime, null, 2) + '\n', { flag: 'wx' });
  if (argv.includes('--receipt')) writeCanonReceipt(sealed, runDir);
}

/**
 * CANON-053: emit the hash-bound rendered-pixel review receipt at
 * docs/visual-qa/LATEST.json, with a committed capture subset (homepage
 * desktop+mobile per theme, plus /evidence/ in dark+light). Capture and inspection
 * are separate facts: only files named by --reviewed-files receive a manual
 * inspection receipt, and the aggregate can claim complete review only when
 * every hash-bound capture was named.
 */
function writeCanonReceipt(manifest, captureDir = OUT_DIR) {
  const receiptName = arg('--receipt-name', 'LATEST.json');
  if (!/^[A-Za-z0-9._-]+\.json$/.test(receiptName)) throw new Error('--receipt-name must be a simple JSON filename');
  // A canonical receipt is always the complete requested Cartesian matrix.
  // Partial receipts cannot prove route × theme × viewport completion.
  const wanted = manifest.shots;
  if (!Array.isArray(wanted) || !wanted.length) throw new Error('capture manifest has no shots');
  const adaptive = manifest.capturePlan ? validateScrollTileCoverage(manifest.capturePlan, wanted) : null;
  if (!adaptive && wanted.some(shot => shot.state === 'scroll-tile')) throw new Error('Scroll-tile receipt requires its original sealed plan');
  for (const shot of wanted) {
    if (!shot.observedTheme) throw new Error(`Theme evidence missing for ${shot.file}; recapture before writing a receipt`);
    if (['stored', 'root', 'body'].some(key => shot.observedTheme[key] !== shot.theme)) {
      throw new Error(`Theme evidence mismatch for ${shot.file}; requested ${shot.theme}`);
    }
  }
  const reviewedFiles = new Set(arg('--reviewed-files', '').split(',').map((value) => value.trim()).filter(Boolean));
  const reviewer = arg('--reviewer', 'image-capable agent');
  const capturedFiles = new Set(wanted.map((shot) => shot.file));
  const unknownReviewedFiles = [...reviewedFiles].filter((file) => !capturedFiles.has(file));
  if (unknownReviewedFiles.length) {
    throw new Error(`--reviewed-files includes uncaptured file(s): ${unknownReviewedFiles.join(', ')}`);
  }
  const images = validateVisualCapture(ROOT, captureDir, manifest, captureSourceFiles([...new Set(wanted.map(shot => shot.route))]));
  const captures = wanted.map((shot, index) => {
    return {
      theme: shot.theme,
      observedTheme: shot.observedTheme,
      viewportName: shot.viewport,
      viewport: VIEWPORT_PRESETS.find((viewport) => viewport.name === shot.viewport),
      file: images[index].publishedFile,
      sha256: shot.sha256,
      page: shot.route,
      state: shot.state,
      ...(adaptive ? serializeScrollTileState(shot) : {}),
      inspection: reviewedFiles.has(shot.file)
        ? { mode: 'manual', reviewer }
        : { mode: 'automated-only' },
    };
  });
  const manuallyReviewed = captures.filter((capture) => capture.inspection.mode === 'manual').length;
  const completeManualReview = captures.length > 0 && manuallyReviewed === captures.length;
  const routes = [...new Set(captures.map((capture) => capture.page))];
  const themes = [...new Set(captures.map((capture) => capture.theme))];
  const viewports = [...new Set(captures.map((capture) => capture.viewportName))].map((name) => VIEWPORT_PRESETS.find((viewport) => viewport.name === name));
  const states = [...new Set(captures.map((capture) => capture.state))];

  const receipt = {
    schemaVersion: 1,
    inspectionSchemaVersion: 2,
    capturedAt: manifest.capturedAt,
    captureProvenance: manifest.captureProvenance,
    generatedBy: 'scripts/capture-theme-matrix.mjs --receipt',
    themes: THEMES,
    source: manifest.captureProvenance.source,
    candidate: manifest.captureProvenance.candidate,
    matrix: { routes, themes, viewports, states, expectedCaptures: adaptive ? adaptive.plannedCaptures : routes.length * themes.length * viewports.length * states.length, completedCaptures: captures.length,
      ...(adaptive ? { coverageMode: 'scroll-tiles-v1', capturePlan: manifest.capturePlan, plannedCases: adaptive.plannedCases } : {}) },
    inspection: {
      renderedPixelsReviewed: completeManualReview,
      coverage: {
        totalCaptures: captures.length,
        manuallyReviewed,
        automatedOnly: captures.length - manuallyReviewed,
        complete: completeManualReview,
      },
      reviewer: manuallyReviewed ? reviewer : null,
      findings: [],
      fixesApplied: [],
      blockingDefectsOpen: completeManualReview ? 0 : null,
      limitation: completeManualReview
        ? null
        : 'Unreviewed captures prove rendering and hash binding only; they do not claim human-judged hierarchy, readability, or contrast.',
    },
    captures,
  };
  publishVisualCapture(ROOT, captureDir, manifest, receipt, receiptName, captureSourceFiles(routes));
  console.log(`capture-theme-matrix: CANON-053 receipt → docs/visual-qa/${receiptName} (${captures.length} hash-bound capture(s))`);
}

const IS_DIRECT = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(url.fileURLToPath(import.meta.url));
if (IS_DIRECT && argv.includes('--receipt-only')) {
  try {
    const prior = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'manifest.json'), 'utf8'));
    if (!Array.isArray(prior.shots) || !prior.shots.length) throw new Error('capture manifest has no shots');
    writeCanonReceipt(prior);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
} else if (IS_DIRECT) {
  main().catch((error) => { console.error(error); process.exit(1); });
}
