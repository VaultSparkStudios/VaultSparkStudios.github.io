// Tracked CTA families whose `shown` denominator must mean a real viewport view.
// Add new conversion surfaces here first, then wire their emit-site and rollup.
export const CTA_CONTRACTS = [
  {
    family: 'play-next',
    source: 'assets/cross-game-play-next.js',
    shownEvent: 'play-next:shown',
    clickEvent: 'play-next:click',
    rollupFamily: 'play-next',
    epoch: '2026-07-02',
    gatedCall: 'countImpression();',
  },
  {
    family: 'proof-line',
    source: 'assets/proof-conversion-line.js',
    shownEvent: 'proof-line:shown',
    clickEvent: 'proof-line:click',
    rollupFamily: 'proof-line',
  },
];
