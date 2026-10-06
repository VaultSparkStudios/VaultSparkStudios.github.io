# Vault Compass — popup audit and experience proposal

2026-10-06 · Implemented candidate; staging/live acceptance pending · Owner: website project implementer · Version 2 — Spark

## Recommendation

Replace competing discovery prompts with one optional **Vault Compass**. A quiet, clearly named control opens an atmospheric map of the studio. The same route manifest powers a simple accessible list and machine-readable itineraries for AI agents. Delight happens after the visitor chooses to enter.

The Compass is a navigation experience, not a mandatory onboarding funnel. Playing a game, reading a story or verifying the studio must remain possible through ordinary page links. Membership stays a choice at an appropriate destination.

## Spark — accepted creative direction

The companion is **Spark**; the experience it opens is **Vault Compass**. The founder accepted the living-sphere concept and explicitly requested removal of both pictured corner guides. This section records the accepted design. The implementation is a candidate; release verification is tracked separately.

### Ownable identity

Spark is a translucent sphere containing an irregular golden energy core, two offset orbital rings and fine constellation traces. It expresses curiosity through orientation, light and movement. Its silhouette must remain recognizable at icon size and as the centerpiece of the open Compass.

Design the core as a VaultSpark artifact rather than a generic robot head, emoji face, paperclip imitation or rainbow gradient ball. Use one broad etched ring, one fine orbital arc, a few restrained light fragments and a soft contact shadow. A static frame must look complete without animation. Header entry is named **Spark**, with the accessible name “Open Spark — Vault Compass.”

| Layer | Visual direction | Meaning |
|---|---|---|
| Core | Warm gold, contained white-hot center | VaultSpark and the active choice |
| Ember region | Orange and copper | Play and games |
| Violet region | Violet and plum | Explore and worlds |
| Electric-blue region | Blue and cyan | Build and tools |
| Evidence region | Clear glass, ivory/gold etching | Verify and real evidence |

Each region also has a label, icon and selected state; color never carries meaning alone. Bloom stays behind art, not text. Light theme uses ivory, ink and readable metal accents. High Contrast uses strong outlines and patterns in place of transparency. Use existing theme tokens for functional text and controls.

### Motion score

Timings below are design starting points for rendered review, not measured performance.

| State | Spark behavior | Interaction rule |
|---|---|---|
| Closed | Composed static miniature sphere | No continuous animation, pulse, bouncing or unread badge |
| Hover / keyboard focus | Core brightens; one ring tilts over 140–180ms | Keyboard and pointer receive equivalent acknowledgement |
| Opening | Sphere resolves; rings unfold over 350–450ms | Usable list and close control appear immediately; animation never gates input |
| Open idle | Shell turns over 24–36s; core breathes over 6–8s | Gentle amplitude, no flashing; pause when hidden |
| Region selected | Light connects core to region over 180–240ms | Text and hit areas remain stationary |
| Inspect proof | Shell clears to reveal evidence connections | Plain source/date list remains authoritative |
| Save path | Selected stops form an interior constellation | Only after explicit save; no inferred active mission |
| Completion | One contained spark resolves into a sigil | Receipt inside the open experience, no corner toast |
| Stale/unavailable source | Motion settles; readable status appears | No fabricated live signal or endless spinner |
| Closing | Rings settle over 120–180ms | Dismissal and focus return are prompt, not delayed by animation |

Reduced motion has crisp static changes: no orbit, breathing, parallax or traveling lights. Include **Motion: Gentle / Still** and a pause control. Immersive mode may add richer motion after opt-in. Audio stays off by default. No preference permits automatic opening.

### Space and controls

Desktop: Spark occupies a large illustration area in a centered chamber. Play, Explore, Build and Verify labels surround it; a stable destination list sits alongside. Search, close and Map/List controls stay in a fixed toolbar within the dialog. Orbital rings are decorative: actual destination buttons do not orbit or require precision targeting.

Mobile: a full-height sheet presents a compact Spark stage, region choices and the same list. Art yields space when search or the software keyboard is active. Account for safe-area insets and keep close reachable while content scrolls. The sheet does not obstruct the page while closed.

Map and list share selection state, and switching representations never resets a route. Use one semantic control per action; decorative artwork must not duplicate screen-reader announcements. If art cannot load, the list remains useful.

### Personality

Spark is curious, concise and quietly playful. It helps on request and celebrates actions actually taken. It is a designed companion, not a claim of consciousness or a visitor-emotion detector. Most personality comes from movement, not chatter.

| Context | Example copy |
|---|---|
| Games entry | “Find something playable.” |
| General opening | “Where shall we go?” |
| Evidence disclosure | “Here’s what shipped.” |
| Saved route | “Your path is here.” |
| Empty result | “Try another interest, or browse all destinations.” |
| Unavailable source | “This source is unavailable. You can still browse.” |

At most one short helper sentence per state. No guilt, urgency, sales monologue, unsolicited “I noticed…” or claims of inspecting private account state.

### Visitor journey

1. Browse normally: neither pictured corner guide appears.
2. Choose Spark or Ctrl/Command + K: the single Compass opens and Spark unfolds.
3. Receive a useful page default: Games emphasizes Play and genuinely playable choices. Search and Browse All remain direct alternatives; no mandatory interview.
4. Choose a region: at most three leading destinations appear. Inspect evidence or the full list when desired.
5. Preview a route: all stops are visible before deliberately starting or saving it. Preview alone never starts a quest.
6. Navigate: Spark stays closed on the destination. An explicitly saved path is available on the next manual opening.

An agent-supplied itinerary shows stops, reasons and source dates for human review. Spark traces the same route visually. Opening a route never purchases anything, changes an account or automatically navigates through multiple pages.

### Shared human/agent contract

Human cards, route previews and agent exports use the same versioned public manifest. Export selected public stop IDs, canonical URLs, availability, prerequisites and evidence; exclude browsing history and member data. Revalidate old itineraries and visibly flag changed/unavailable destinations. Offer **Review updated route**, not silent substitution.

Share links encode public stop IDs or a curated public route ID. First release requires no server-side private itinerary store, new paid service or model call. AI dialogue remains a later explicit Ask capability with separately authorized operating costs.

### Signature inventions and release boundary

- **Constellation memory:** explicitly saved routes appear as star patterns within Spark. Their labels live in Saved Paths; they are not notification badges.
- **Proof Orbit:** selecting Verify transforms colorful glass into an etched evidence instrument, with real source dates alongside it.
- **Signal Mixing:** two selected interests produce two colored traces connecting a validated preview route. Deterministic metadata and curation come first.
- **Earned sigils:** deliberate route completion creates a local decorative mark. Preserve existing completion records; do not alter member ranks or paid benefits.
- **Studio seasons:** later editorial artwork may reflect a real public event or shipped world, never a fake activity signal or forced opening.

First release: sphere, polished opening, four regions, shared list/search, saved-path migration, Proof Orbit and removal of legacy corner guides. Signal Mixing and sigils are subsequent selected enhancements. Conversational AI, voice, advanced 3D rendering and seasonal artwork are later options.

Start with SVG/CSS or an equivalent lightweight project-owned renderer; create apparent spherical depth with layered shells and projected rings. Evaluate a true 3D renderer only if the prototype cannot achieve the accepted visual quality within performance/accessibility gates. Prototype both a moving frame and a static frame before choosing rendering complexity.

## Mandatory removal of the two pictured guides

**Bottom left:** retire the fixed “Resume World Builder / Follow the next signal” constellation compass. **Bottom right:** retire the fixed “Your route · 3 short steps / Start this route” guide. This means removing their independent render paths, not relocating, shrinking, delaying or alternating them.

Implementation requirements:

1. Retire `showCompass` and its automatic boot trigger in `assets/constellation-tracker.js`; preserve useful sequence/completion data for Compass.
2. Retire automatic `showTour` offers in `assets/journey-conductor.js` from second-page, scroll, palette-intent and tracked-action triggers. Useful guides become requested content inside Spark.
3. Stop constellation unlocks from creating replacement corner toasts; accomplishments become quiet Compass receipts.
4. Remove obsolete panel styles, bindings and loader assumptions. Review independent inline game bridges separately rather than discarding them accidentally.
5. Rebuild generated/hashed shell assets and verify service-worker references so old derived bundles do not resurrect the guides. Verify the actual served release.
6. Migrate saved, completed and dismissed state conservatively; browsing history never becomes an automatically activated Spark quest.

Regression checks must exercise fresh and legacy localStorage after arrival, page sequences, half-page scroll, palette actions, route changes and multiple completions. Assert absence of `.vs-cst-compass`, `[data-constellation-compass]`, `.vs-cst-toast` and automatic `.vs-journey` guides. Catalog controls remain unobstructed at desktop and mobile sizes. Empty selector checks without qualifying interactions are insufficient.

Spark is the replacement entry, not a third popup. Both page corners stay free of discovery guides when Spark is closed. Removal remains a mandatory first wave even if the decorative sphere takes additional iteration.

## Audit findings and evidence

| Finding | Evidence | Consequence |
|---|---|---|
| Two automatic cards cover the catalog | Supplied screenshot: resume compass at bottom left; route tutorial at bottom right | Competing yellow actions and blocked game-selection space |
| Three layers suggest the next move | Screenshot: Pathfinder, Find Your Game, route/resume overlays | Visitors must decode competing navigation systems before choosing a game |
| Constellations bypass the shared attention claim | `assets/constellation-tracker.js`: showCompass and showToast append directly; no VSAttention claim | They can coexist with a budgeted tutorial |
| Floating registry misses constellations | `assets/ambient-loader.js`: FLOATING_SELECTORS and BLOCKING_SELECTORS omit compass/toast selectors | Existing collision/reserve mechanism cannot coordinate these cards |
| Tutorial dismissal is route-specific | `assets/journey-conductor.js`: key is family + path; offers stored by key | Closing on one page does not imply silence elsewhere |
| Same producer can claim again | `assets/ambient-loader.js`: current claim equal to name returns true | A per-tab budget does not impose a one-off offer across routes for the same producer |
| Browse history qualifies as an offer | Journey uses second distinct recorded page, 50% scroll, command intent or action; starts after roughly 2.2 seconds | Routine browsing can trigger an interruption without requesting help |
| Progress does not mean a chosen quest | Tracker records visits automatically and finds an incomplete sequence | “Resume World Builder” can imply a goal never deliberately started |
| Static generic route targets can be redundant | General tutorial links to `/games/`, including when viewing the Games catalog | Its primary action can return to the current destination |
| Theme risk in compass/toast | Tracker injects hardcoded dark backgrounds and gold text | First-class light/high-contrast appearance needs separate verification |
| Checks miss runtime collisions | Attention contract 15/15; journey contract 15/15, both passing during this audit | Passing source-token tests do not establish acceptable runtime behavior |

These findings establish overlapping and repeatable interruption paths. They do **not** establish a visitor abandonment percentage. The supplied screenshot is visual evidence; fresh live browser reproduction, mobile behavior and other themes remain unverified because this session has no available connected browser. No UI was changed and no new visual QA receipt is claimed.

## The proposed experience

### Closed: calm and useful

A small **Spark** control with its miniature sphere lives in the existing header utility area. Mobile gets the same named control in navigation, with a reachable manual entry when the header scrolls away. Consolidate the existing help/guide launchers that serve the same function; do not add another floating corner bubble. Ctrl/Command + K opens this same experience through the existing palette.

It never expands on arrival, scroll depth, repeat visits or exit intent. No bouncing, pulsing, notification count or unread badge. A page may expose one contextual inline link, such as “Find a game with Compass,” beside relevant content.

### Open: an illustrated living vault

Desktop opens a spacious centered chamber; mobile opens a full-height sheet using 100dvh with its own scroll area. A forged central VaultSpark emblem anchors four named regions: **Play**, **Explore**, **Build**, **Verify**. Use commissioned or studio-owned artwork and real project cover art, etched gold lines, strong typography and measured depth. Each region always has plain-language text.

Dark uses obsidian surfaces and warm metal accents; light uses ivory and ink with readable bronze; other themes retain their own palettes. Do not tint everything gold. Text and controls use existing semantic theme tokens. A short entrance transition may connect the launcher to the chamber; idle animation stops when hidden. Reduced motion shows the completed composition immediately. Audio is off by default and available only as a later optional enhancement.

The map is an alternate representation of the same semantic list. **Map / List** switch is always visible. Search stays available, including in the list. A static illustration must still feel intentional when animation is off. No new WebGL engine is required for the first implementation.

### Choose: one outcome at a time

First opening asks “What brings you into the Vault?” with four choices and a short default list. On Games, the list defaults to playable games rather than generic account/membership suggestions. Three useful destinations maximum per recommendation view; one leading action per card. Availability is explicit: Play now, Preview, In the Forge, or Vaulted. A Forge item never masquerades as playable.

Choosing a route presents the actual destination, why it fits, and optionally a two- or three-stop itinerary. Following a link performs ordinary navigation. Selecting **Save this path** explicitly creates a resumable goal; passive browsing can remain a local discovery history, but must not be labelled an active mission. Returning visitors can resume inside the Compass without a new prompt.

### Optional inventions

1. **Proof Orbit.** Expand a destination to see the real shipped change, its date and source. Visually, small evidence nodes orbit the project; semantically, it is a readable disclosure list. Old data says stale or unknown. It makes the studio's work part of discovery without another verification tutorial.
2. **Signal Mixing.** Select two interests—strategy + worldbuilding, tools + studio craft, lore + exploration—and watch a validated three-stop path connect them. Show the full route before starting. Deterministic metadata and editorial curation come first; no model is necessary.
3. **Shared itinerary.** The exact chosen route can be copied as an ordinary link or exported as public JSON for an agent. A visible preview shows the selected stops and prerequisites. A person can explore the same route their assistant recommended and inspect the same evidence.
4. **Earned sigil.** Explicitly started routes can unlock a decorative local sigil inside the Compass. Preserve existing constellation completion where possible. No rank changes, member rewards, scarcity claims or purchases are attached. A quiet receipt replaces a popup; confetti, if offered later, requires an immersive-mode preference.

These are proposed differentiators, not claims that competitors lack them. Default implementation includes the shell and parity; optional inventions follow only at the selected depth.

## What happens to each existing surface

| Existing surface | Proposed destination |
|---|---|
| Route micro-tour | On-demand guided path within Compass; no automatic offer |
| Constellation resume card | Saved-path section; no fixed card |
| Constellation unlock toast | Quiet completion receipt in Compass; local state preserved |
| Pathfinder generic recommendations | Reuse ranking behind Compass; replace catalog's generic top block with a compact contextual link |
| Find Your Game chooser | Keep inline catalog task; share metadata with Compass so it does not ask the same question twice |
| Command palette | Existing fast list becomes Compass List/Search mode; keep keyboard muscle memory |
| IGNIS help/lens | Reuse relevant intelligence and explicit Ask entry inside the shared experience after verifying contracts; avoid a second assistant window |
| Feedback/rate prompts | Inline after a completed task or under Compass feedback; never auto-expand |
| Exit-intent/visit-depth/digest/install promotions | Audit each loader; turn promotional offers into requested inbox entries or inline context, not a replacement popup queue |
| Cookie consent, authentication, errors | Remain purpose-specific functional flows; they take precedence and do not get disguised as discoveries |

Portal functional onboarding and established membership economics are separate contracts. Integrating public discovery must not rewrite auth, paid entitlements or ranks. The first release targets the public website.

## Behavior contract

- Zero unsolicited discovery dialogs across arrival, scroll, second page, exit, return and completion.
- At most one shared discovery dialog open. Opening Compass while a functional consent/auth flow is active defers to that flow.
- Close and Escape return focus to the opener; they never schedule the next suggestion. Closing preserves entered search and selected path within the visit.
- **Quiet** persists locally across pages/reloads; the manual Compass remains available. **Normal** is the default, with restrained transitions on explicit open. **Immersive** is opt-in for additional motion and celebrations. All three prohibit automatic expansion.
- Reuse older dismissals conservatively; keep completion badges; do not infer that historical visits constituted an explicit quest start.
- No storage access means session-only state and no re-prompting. Corrupt storage is ignored safely. Preferences synchronize across same-origin tabs when available.
- Dialog content has headings, button/link semantics, visible focus, 44px touch controls, keyboard support and a fully equivalent list. Use the native dialog pattern where suitable; no false modal semantics on a nonmodal panel.
- No canvas-only controls, inaccessible dragging, automatic audio, forced tour, hover-only labels or color-only status.

Modal keyboard focus stays within an open modal; Escape dismisses it and closing restores focus appropriately. Follow the [W3C dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). The recommendation to replace automatic overlays with contextual, requested content is consistent with [Nielsen Norman Group's popup research](https://www.nngroup.com/articles/popups/).

## Humans and agents: one content contract

Reuse `/api/intent-map.json`, `/data/intent-graph.json`, `/api/public-intelligence.json`, existing route/proof builders and `agents.json`. Check the registry before introducing new infrastructure. Build a small project-owned manifest adapter and renderers; no new paid service or dependency is proposed.

Each public destination carries: stable ID, label, canonical URL, outcome, availability, audience, prerequisites, evidence URL, updated time, freshness and route revision. Human cards and agent itineraries consume those fields. Build-time validation rejects dead URLs and contradictory availability. Live availability is qualified by its source date, not inferred from animation.

Agents discover the manifest through existing public metadata and can read it directly without a browser, animation, account or consent click. It describes capabilities honestly: navigation and public evidence are read-only; account or consequential actions retain their existing Obelisk flows. Do not add agent auth to a public route feed unnecessarily. Do not detect humans versus agents by user-agent strings.

The public manifest contains no private browsing history or member state. Export is explicit and includes only chosen public stops. AI assistance, if added later, receives only what the person intentionally sends, shows sources, and requires a separately authorized operating budget. No model call occurs on page arrival, default recommendation or Compass opening.

## Implementation sequence and acceptance

| Wave | Deliverable | Dependency | Acceptance evidence |
|---|---|---|---|
| 1 · Calm browsing | Suppress automatic discovery; durable quiet setting; preserve progress | Existing producer inventory and storage migration | Browser journeys across Games/Roadmap/Community; no unsolicited panels or follow-up queue |
| 2 · Compass foundation | One shell, palette/search reuse, semantic route list and agent manifest | Wave 1; route/status validation | Human and agent destination parity; no dead/default-current-page primary actions; zero paid model calls |
| 3 · Immersive craft | Artwork/map, Proof Orbit, selected Signal Mixing and itinerary export | Wave 2; genuine source evidence | Map/list parity; real dated evidence; public-only export; reduced-motion static quality |
| 4 · Release proof | All themes/states, accessibility, performance and staging | Waves 1–3 at agreed depth | Inspected before/after screenshots, hash-bound visual receipt, staging checks and permitted production promotion |

The ranked sidecar contains 12 scoped recommendations with minimal/solid/deep recipes. Revised L2 estimates sum to **95 engineering hours**, including Spark's motion/state work and verification; overlapping work can reduce this, while art iteration and release defects can increase it. This is a planning estimate, not a deadline or spending authorization. First increment retires both corner guides; the functional Spark shell precedes deeper visual and optional invention work.

Required scenarios: fresh visitor with consent unresolved; returning visitor with constellation history; previously dismissed tour on another route; multiple simultaneous completions; Ctrl/Command + K; repeated fast open/close; mobile keyboard; reduced motion; denied/corrupt storage; no JS; slow/offline data; stale proof; visible error/auth flow; zoom and screen reader.

Capture desktop >=1280px and mobile <=430px for all seven themes: Dark, Light, Ambient, Warm, Cool, Lava, High Contrast. Inspect closed launcher, open map/list, search, saved path, completion, empty and stale states. Fix and recapture defects. Bind `docs/visual-qa/LATEST.json` to the actual implementation and run the project's visual checker. Release requires staging and the applicable release gate; this audit authorizes neither deployment nor changes to auth or membership promises.

Performance acceptance: no Compass-attributable layout shift on arrival; no model requests; deferred artwork absent from initial load; measure dialog open latency and added transfer rather than guessing. Target response to explicit opening <=200ms for the usable list on a representative midrange device, with measured warm/cold results. Existing project web-vitals gates remain applicable.

Measure unexpected auto-expansions (target zero), destination success, time to a playable game, route completion for explicitly started paths, quiet preference and task clarity. Reuse `/v/rum` allowlists and aggregate reporting; no raw history, typed search queries or identity in new events. Establish a baseline before claiming conversion gains. Do not optimize popup impressions or badge farming.

Rollback: version the manifest and preference schema; keep ordinary page navigation intact. Disable the decorative layer independently; fall back to the semantic list. Do not restore automatic discovery producers as the rollback strategy. Preserve existing achievements through idempotent migration.

## Audit disposition

Homepage terminology follow-up: `index.html` and `scripts/lib/org-entity.mjs` say “From Artificial Intelligence to Synthetic Intelligence” under D-S368.8. The [official September 29 order](https://www.whitehouse.gov/presidential-actions/2026/09/inaugurating-the-era-of-super-intelligence/) directs executive-branch use of “Super Intelligence”; it does not establish a VaultSpark capability or replace the studio's selected definition. Recommendation: retain Synthetic Intelligence for the studio's composed-system concept, or simplify the hero to “Human imagination. AI-powered games, tools, and worlds.” Using Super Intelligence as studio positioning would require an explicit new terminology decision. No hero edit was made.

Completed: implementation at the selected depth, two independent review rounds, canonical staging interaction checks, final seven-theme browser capture and manual inspection, mobile matrix and lab performance measurement. Production promotion and field/user cohort measurements remain pending. No live behavior is claimed.

Startup: canonical brief refreshed and format-validated; Canon/Ark sync succeeded with five pending review rows; frontier radar current; maintenance lane checked. Context usage initially unmeasured; derived brief includes an inconsistent percentage and is not treated as fresh measurement. The sibling start-sync fallback targeted Studio Ops and refused its substantive residue; no pull/rebase succeeded. This did not require modifying that sibling's WIP. Existing conformance gaps/parse errors remain outside this discovery-only proposal and must be rechecked for any future release.
