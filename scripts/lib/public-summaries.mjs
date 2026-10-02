// Shared by build-ai-canonical-pages.mjs and build-entity-graph.mjs.
/**
 * Visitor-safe summaries that override the studio-ops registry `summary`.
 *
 * The registry summary is written for operators: it carries build gates,
 * scorecards, revenue plans, tech stacks and former codenames ("Formerly
 * Dunescape", "launch-ready candidate gated by outreach", "Scorecard v5").
 * A fact sheet is a public page, so it says what the product IS for the
 * person reading it. Founder rulings D-S368.3 fix the descriptions of Solara
 * and MindFrame; the rest drop operator detail only. Ship the same wording
 * upstream (Ark → studio-ops) so the registry converges and these can retire.
 */
export const PUBLIC_SUMMARY = Object.freeze({
  solara: 'A browser roguelite RPG with a shared world. Every player death dims a shared sun — run the daily dungeon, leave your grave on the living map, and fight to keep the light alive.',
  mindframe: 'A live metacognition training platform. Cognitive modes and challenges build a persistent Mind Model of how you think — so your own thinking becomes observable, measurable and trainable.',
  velaxis: 'A live cryptocurrency market intelligence dashboard. Specialized views for market overview, top movers and technical signals — signal over noise for active traders, with no custody of your funds.',
  promogrind: 'A sportsbook promo conversion suite. 53 calculators, a profit-and-loss tracker and educational promo math. 21+. Gambling involves risk; if you or someone you know has a gambling problem, call 1-800-GAMBLER.',
  ouren: 'An ambient AI app for smart eyewear. Quiet, glanceable intelligence that stays out of your way.',
  sparkraid: 'A creator-economy tipping and payments platform. Every tip is an event.',
  statvault: 'A sports analytics platform with live stats and clear data labels, live at statvault.org.',
  shadow: 'An AI artist-agent and operating system for artists, with a private beta and waitlist at yourshadow.io.',
  scriptorium: 'A manuscript scoring and editing tool. Detailed, multi-dimension feedback that helps writers revise with intent.',
});

/** Registry summary with the visitor-safe override applied. */
export function publicSummary(p) {
  return (p && PUBLIC_SUMMARY[p.slug]) || (p && p.summary) || '';
}
