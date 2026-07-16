// tests/oracle-insights.spec.js (S136 carry)
// Pure-function unit tests for computeInsights() — the narrative card generator
// for /oracle/. Loads the shared module via Node require() (dual-target export
// pattern in assets/oracle-insights-compute.js) and asserts narrative shape +
// content against fixture velocity series.
//
// Runs under Playwright's test runner but does NOT need a browser — fully
// deterministic by injecting `now` so the "peak day · X days ago" math is
// stable regardless of wall-clock.
const { test, expect } = require('@playwright/test');
const path = require('node:path');

const compute = require(path.join(__dirname, '..', 'assets', 'oracle-insights-compute.js'));
const { computeInsights, computeForecasts } = compute;

function makeSeries({ commits, active, ignis, peakDay, peakCount }) {
  const dates = commits.map((_, i) => {
    const d = new Date('2026-03-20T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  return {
    series: { dates, commits, active: undefined, activeRepos: active, ignis },
    ecosystem: { peakCommitDay: peakDay, peakCommitCount: peakCount },
  };
}

const FIXED_NOW = new Date('2026-05-18T12:00:00Z');

test.describe('computeInsights() — pure narrative generator', () => {
  test('returns empty when velocity is null/undefined', () => {
    expect(computeInsights(null, null, FIXED_NOW)).toEqual([]);
    expect(computeInsights(undefined, undefined, FIXED_NOW)).toEqual([]);
    expect(computeInsights({}, {}, FIXED_NOW)).toEqual([]);
  });

  test('climbing velocity → green accent + "climbing" headline', () => {
    // 30-day prior baseline averaging 5/day, last 7 days averaging 10/day → +100%
    const commits = new Array(60).fill(5);
    for (let i = 53; i < 60; i++) commits[i] = 10;
    const fixture = makeSeries({
      commits,
      active: new Array(60).fill(2),
      ignis: new Array(60).fill(46000),
      peakDay: '2026-04-15', peakCount: 99,
    });
    const insights = computeInsights(fixture, {}, FIXED_NOW);
    const velocity = insights.find((i) => i.eyebrow === 'Velocity');
    expect(velocity).toBeTruthy();
    expect(velocity.accent).toBe('#5ad28d');
    expect(velocity.headline).toBe('Forge is climbing.');
    expect(velocity.body).toMatch(/\+\d+%/);
  });

  test('cooling velocity → red accent + "cooling" headline', () => {
    const commits = new Array(60).fill(10);
    for (let i = 53; i < 60; i++) commits[i] = 2;     // last 7 days dip
    const fixture = makeSeries({
      commits,
      active: new Array(60).fill(2),
      ignis: new Array(60).fill(46000),
      peakDay: '2026-04-15', peakCount: 99,
    });
    const insights = computeInsights(fixture, {}, FIXED_NOW);
    const velocity = insights.find((i) => i.eyebrow === 'Velocity');
    expect(velocity.accent).toBe('#ff5c5c');
    expect(velocity.headline).toBe('Forge is cooling.');
  });

  test('steady velocity (±20%) → gold accent + "steady" headline', () => {
    const fixture = makeSeries({
      commits: new Array(60).fill(5),                  // perfectly flat
      active:  new Array(60).fill(2),
      ignis:   new Array(60).fill(46000),
      peakDay: '2026-04-15', peakCount: 99,
    });
    const insights = computeInsights(fixture, {}, FIXED_NOW);
    const velocity = insights.find((i) => i.eyebrow === 'Velocity');
    expect(velocity.accent).toBe('#FFC400');
    expect(velocity.headline).toBe('Forge is steady.');
  });

  test('co-activity card only emits when ≥7 of last 14 days had 3+ repos', () => {
    // 8 of 14 → emit
    const active = new Array(60).fill(1);
    for (let i = 46; i < 54; i++) active[i] = 3;       // 8 days active
    const fixture = makeSeries({
      commits: new Array(60).fill(5),
      active,
      ignis: new Array(60).fill(46000),
      peakDay: '2026-04-15', peakCount: 99,
    });
    const insights = computeInsights(fixture, {}, FIXED_NOW);
    expect(insights.find((i) => i.eyebrow === 'Co-activity')).toBeTruthy();

    // 6 of 14 → do NOT emit
    const active2 = new Array(60).fill(1);
    for (let i = 48; i < 54; i++) active2[i] = 3;      // 6 days active
    const fixture2 = makeSeries({
      commits: new Array(60).fill(5),
      active: active2,
      ignis: new Array(60).fill(46000),
      peakDay: '2026-04-15', peakCount: 99,
    });
    const insights2 = computeInsights(fixture2, {}, FIXED_NOW);
    expect(insights2.find((i) => i.eyebrow === 'Co-activity')).toBeUndefined();
  });

  test('IGNIS trajectory headline matches direction of delta', () => {
    // Climbing
    const ignisUp = new Array(60).fill(0).map((_, i) => 45000 + i * 10);
    const upFix = makeSeries({
      commits: new Array(60).fill(5), active: new Array(60).fill(2),
      ignis: ignisUp, peakDay: '2026-04-15', peakCount: 99,
    });
    expect(computeInsights(upFix, {}, FIXED_NOW)
      .find((i) => i.eyebrow === 'Studio cognition').headline).toMatch(/climbed/);

    // Dipping
    const ignisDown = new Array(60).fill(0).map((_, i) => 46000 - i * 10);
    const downFix = makeSeries({
      commits: new Array(60).fill(5), active: new Array(60).fill(2),
      ignis: ignisDown, peakDay: '2026-04-15', peakCount: 99,
    });
    expect(computeInsights(downFix, {}, FIXED_NOW)
      .find((i) => i.eyebrow === 'Studio cognition').headline).toMatch(/dipped/);

    // Steady (start === end)
    const ignisFlat = new Array(60).fill(46000);
    const flatFix = makeSeries({
      commits: new Array(60).fill(5), active: new Array(60).fill(2),
      ignis: ignisFlat, peakDay: '2026-04-15', peakCount: 99,
    });
    expect(computeInsights(flatFix, {}, FIXED_NOW)
      .find((i) => i.eyebrow === 'Studio cognition').headline).toBe('Cognition held steady.');
  });

  test('peak day card computes "days ago" against injected clock', () => {
    // FIXED_NOW = 2026-05-18T12:00:00Z (noon). peakDay parsed at midnight UTC.
    // diff(2026-05-16) = 2.5 days → Math.round → 3 "days ago"
    const fixture = makeSeries({
      commits: new Array(60).fill(5),
      active:  new Array(60).fill(2),
      ignis:   new Array(60).fill(46000),
      peakDay: '2026-05-16',
      peakCount: 250,
    });
    const peak = computeInsights(fixture, {}, FIXED_NOW)
      .find((i) => i.eyebrow === 'Loudest day');
    expect(peak).toBeTruthy();
    expect(peak.body).toMatch(/3 days ago/);
    expect(peak.body).toMatch(/2026-05-16/);
    expect(peak.headline).toContain('250');
  });

  test('peak day uses singular "day" when 1 day ago', () => {
    // FIXED_NOW = 2026-05-18T12:00:00Z. peakDate = 2026-05-18T00:00:00Z.
    // diff = 0.5 days → Math.round → 1 "day ago"
    const fixture = makeSeries({
      commits: new Array(60).fill(5),
      active:  new Array(60).fill(2),
      ignis:   new Array(60).fill(46000),
      peakDay: '2026-05-18',
      peakCount: 250,
    });
    const peak = computeInsights(fixture, {}, FIXED_NOW)
      .find((i) => i.eyebrow === 'Loudest day');
    expect(peak.body).toMatch(/1 day ago/);
    expect(peak.body).not.toMatch(/1 days ago/);
  });

  test('returns at most 4 insight cards even when all four conditions fire', () => {
    const active = new Array(60).fill(3);              // co-activity will emit
    const commits = new Array(60).fill(5);
    for (let i = 53; i < 60; i++) commits[i] = 10;
    const ignis = new Array(60).fill(0).map((_, i) => 45000 + i * 10);
    const fixture = makeSeries({
      commits, active, ignis,
      peakDay: '2026-05-15', peakCount: 250,
    });
    const insights = computeInsights(fixture, {}, FIXED_NOW);
    expect(insights.length).toBeLessThanOrEqual(4);
    expect(insights.length).toBe(4);                   // exactly 4 when all fire
  });

  test('short series (< 14 days) emits only peak-day card', () => {
    const fixture = makeSeries({
      commits: [1, 2, 3, 4, 5],
      active:  [1, 1, 1, 1, 1],
      ignis:   [46000, 46010, 46020, 46030, 46040],
      peakDay: '2026-05-15', peakCount: 99,
    });
    const insights = computeInsights(fixture, {}, FIXED_NOW);
    // No velocity card (<14 days), no IGNIS trajectory, no co-activity
    expect(insights.find((i) => i.eyebrow === 'Velocity')).toBeUndefined();
    expect(insights.find((i) => i.eyebrow === 'Studio cognition')).toBeUndefined();
    expect(insights.find((i) => i.eyebrow === 'Co-activity')).toBeUndefined();
    // Peak day is the only one that fires
    expect(insights.find((i) => i.eyebrow === 'Loudest day')).toBeTruthy();
  });

  test('public-minimal feed derives a third card from lifecycle truth', () => {
    const fixture = makeSeries({
      commits: new Array(60).fill(5),
      active: [],
      ignis: [],
      peakDay: '2026-05-15', peakCount: 99,
    });
    const ecosystem = {
      projects: [
        { vaultStatus: 'sparked' },
        { vaultStatus: 'forge' },
        { vaultStatus: 'forge' },
      ],
    };
    const insights = computeInsights(fixture, ecosystem, FIXED_NOW);
    expect(insights).toHaveLength(3);
    expect(insights.find((i) => i.eyebrow === 'Lifecycle')).toMatchObject({
      headline: '1 live world, 2 in the forge.',
    });
  });
});

test.describe('computeForecasts() — pure Forge Forecast generator', () => {
  const ORIGINAL_DATE_NOW = Date.now;

  test.afterEach(() => {
    Date.now = ORIGINAL_DATE_NOW;
  });

  function ecosystem(projects) {
    return { projects };
  }

  function velocity(perRepo = {}) {
    return {
      series: { dates: new Array(60).fill(0).map((_, i) => `2026-04-${String(i + 1).padStart(2, '0')}`) },
      perRepo,
    };
  }

  test('ship-soon forecast requires shipping language and recent activity', () => {
    const result = computeForecasts(
      velocity({ vorn: { activeDays: 8, totalCommits: 22 } }),
      ecosystem([
        {
          slug: 'vorn',
          name: 'Vorn',
          health: 'green',
          vaultStatus: 'sparked',
          currentFocus: 'Public beta rollout',
          nextMilestone: 'launch',
          staleDays: 1,
        },
        {
          slug: 'quiet',
          name: 'Quiet Project',
          health: 'green',
          vaultStatus: 'forge',
          currentFocus: 'Polish backlog',
          staleDays: 1,
        },
      ])
    );

    expect(result.shipSoon.map((p) => p.slug)).toEqual(['vorn']);
    expect(result.shipSoon[0].confidence).toBeGreaterThanOrEqual(70);
    expect(result.shipSoon[0].body).toMatch(/beta|launch|rollout/i);
  });

  test('climbing forecast ranks high-intensity active projects', () => {
    const result = computeForecasts(
      velocity({
        oracle: { activeDays: 5, totalCommits: 30 },
        slow: { activeDays: 2, totalCommits: 3 },
      }),
      ecosystem([
        { slug: 'oracle', name: 'Oracle', health: 'yellow', vaultStatus: 'forge', staleDays: 0 },
        { slug: 'slow', name: 'Slow', health: 'green', vaultStatus: 'forge', staleDays: 0 },
      ])
    );

    expect(result.climbing.map((p) => p.slug)).toEqual(['oracle']);
    expect(result.climbing[0].confidence).toBeGreaterThan(50);
    expect(result.climbing[0].body).toContain('30');
  });

  test('awakening forecast detects stale official pulse plus fresh filesystem touch', () => {
    Date.now = () => new Date('2026-05-19T12:00:00Z').getTime();
    const result = computeForecasts(
      velocity({
        solara: { activeDays: 1, totalCommits: 1, lastMtime: '2026-05-18T12:00:00Z' },
      }),
      ecosystem([
        { slug: 'solara', name: 'Solara', health: 'green', vaultStatus: 'forge', staleDays: 45 },
      ])
    );

    expect(result.awakening.map((p) => p.slug)).toEqual(['solara']);
    expect(result.awakening[0].confidence).toBeGreaterThanOrEqual(50);
    expect(result.awakening[0].body).toMatch(/Something stirred/);
  });

  test('excludes vaulted and red projects from all forecasts', () => {
    Date.now = () => new Date('2026-05-19T12:00:00Z').getTime();
    const result = computeForecasts(
      velocity({
        vaulted: { activeDays: 10, totalCommits: 80, lastMtime: '2026-05-19T12:00:00Z' },
        red: { activeDays: 10, totalCommits: 80, lastMtime: '2026-05-19T12:00:00Z' },
      }),
      ecosystem([
        { slug: 'vaulted', name: 'Vaulted', health: 'green', vaultStatus: 'vaulted', currentFocus: 'launch', staleDays: 0 },
        { slug: 'red', name: 'Red', health: 'red', vaultStatus: 'forge', currentFocus: 'launch', staleDays: 0 },
      ])
    );

    expect(result.shipSoon).toEqual([]);
    expect(result.climbing).toEqual([]);
    expect(result.awakening).toEqual([]);
  });
});
