(function (window) {
  'use strict';

  var STORAGE_KEYS = {
    pathway: 'vs_entry_pathway',
    membershipIntent: 'vs_last_membership_intent',
    worldAffinity: 'vs_world_affinity',
    visitCount: 'vs_visit_count',
    lastPath: 'vs_last_path',
    exposures: 'vs_intent_exposures',
    feedback: 'vs_micro_feedback_v1'
  };
  var SESSION_KEYS = ['sb-fjnpzjjyhnpmunfoycrp-auth-token', 'supabase.auth.token'];
  var SESSION_MARK = 'vs_intent_visit_mark';

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_) {}
  }

  function safeGetJson(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function safeSetJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function getSession() {
    for (var i = 0; i < SESSION_KEYS.length; i += 1) {
      try {
        var raw = window.localStorage.getItem(SESSION_KEYS[i]);
        if (!raw) continue;
        var parsed = JSON.parse(raw);
        var session = parsed.currentSession || parsed.session || parsed;
        if (session && session.access_token && session.user && session.user.id) return session;
      } catch (_) {}
    }
    return null;
  }

  function currentPath() {
    return window.location.pathname || '/';
  }

  function inferBaseIntent(path) {
    if (path.indexOf('/vaultsparked') === 0 || path.indexOf('/membership') === 0) return 'supporter';
    if (path.indexOf('/vault-member') === 0 || path.indexOf('/join') === 0 || path.indexOf('/invite') === 0) return 'member';
    if (path.indexOf('/universe') === 0 || path.indexOf('/journal') === 0) return 'lore';
    if (path.indexOf('/studio-pulse') === 0 || path.indexOf('/investor') === 0 || path.indexOf('/studio') === 0) return 'investor';
    if (path.indexOf('/games') === 0) return 'player';
    return null;
  }

  function inferJourneyStage(path, loggedIn, membershipIntent) {
    if (loggedIn) return 'member';
    if (path.indexOf('/vaultsparked') === 0) return 'pricing';
    if (path.indexOf('/membership') === 0) return 'considering';
    if (path.indexOf('/vault-member') === 0 || path.indexOf('/join') === 0 || path.indexOf('/invite') === 0) return 'activation';
    if (membershipIntent) return 'considering';
    return 'exploring';
  }

  function inferMembershipTemperature(intent, membershipIntent, loggedIn, path) {
    if (loggedIn) return 'owned';
    if (path.indexOf('/vaultsparked') === 0) return 'hot';
    if (membershipIntent || intent === 'supporter' || intent === 'member') return 'warm';
    return 'cold';
  }

  function inferTrustLevel(visitCount, exposureCount, loggedIn) {
    if (loggedIn) return 'member';
    if (visitCount >= 6 || exposureCount >= 6) return 'high';
    if (visitCount >= 3 || exposureCount >= 3) return 'medium';
    return 'early';
  }

  function readFeedbackSummary() {
    var feedback = safeGetJson(STORAGE_KEYS.feedback, []);
    return feedback.reduce(function (summary, entry) {
      if (!entry || typeof entry !== 'object') return summary;
      summary.count += 1;
      if (entry.usefulness === 'useful') summary.useful += 1;
      if (entry.blocker) {
        summary.lastBlocker = entry.blocker;
        summary.blockers[entry.blocker] = Number(summary.blockers[entry.blocker] || 0) + 1;
      }
      return summary;
    }, {
      count: 0,
      useful: 0,
      lastBlocker: '',
      blockers: {}
    });
  }

  function inferConfidence(pathway, baseIntent, membershipIntent, loggedIn, exposureCount, feedbackSummary) {
    var score = 0;
    if (loggedIn) score += 45;
    if (pathway) score += 25;
    if (membershipIntent) score += 15;
    if (baseIntent) score += 10;
    score += Math.min(15, exposureCount * 3);
    if (feedbackSummary.useful) score += Math.min(8, feedbackSummary.useful * 2);
    if (feedbackSummary.lastBlocker === 'not_clear' || feedbackSummary.lastBlocker === 'need_proof') score -= 6;
    if (feedbackSummary.lastBlocker === 'price_unsure') score -= 4;
    return Math.min(95, score);
  }

  function readExposureCount() {
    var exposures = safeGetJson(STORAGE_KEYS.exposures, {});
    return Object.keys(exposures).reduce(function (sum, key) {
      return sum + Number(exposures[key] || 0);
    }, 0);
  }

  function buildState() {
    var path = currentPath();
    var session = getSession();
    var pathway = safeGet(STORAGE_KEYS.pathway);
    var baseIntent = inferBaseIntent(path);
    var intent = pathway || baseIntent || 'player';
    var membershipIntent = safeGet(STORAGE_KEYS.membershipIntent) === '1';
    var visitCount = Number(safeGet(STORAGE_KEYS.visitCount) || 1);
    var exposureCount = readExposureCount();
    var loggedIn = !!session;
    var feedbackSummary = readFeedbackSummary();

    return {
      intent: intent,
      confidence: inferConfidence(pathway, baseIntent, membershipIntent, loggedIn, exposureCount, feedbackSummary),
      journey_stage: inferJourneyStage(path, loggedIn, membershipIntent),
      world_affinity: safeGet(STORAGE_KEYS.worldAffinity) || inferBaseIntent(path) || 'general',
      trust_level: inferTrustLevel(visitCount, exposureCount, loggedIn),
      membership_temperature: inferMembershipTemperature(intent, membershipIntent, loggedIn, path),
      returning_status: visitCount > 1 ? 'returning' : 'new',
      logged_in: loggedIn,
      membership_intent: membershipIntent,
      referral_active: !!(new URLSearchParams(window.location.search).get('ref') || window.sessionStorage.getItem('vs_ref')),
      pathway: pathway,
      visit_count: visitCount,
      exposure_count: exposureCount,
      feedback_count: feedbackSummary.count,
      hesitation_signal: feedbackSummary.lastBlocker || '',
      current_path: path,
      session: session
    };
  }

  function emitChange() {
    document.dispatchEvent(new CustomEvent('vs:intent-state-change', {
      detail: buildState()
    }));
  }

  function noteVisit() {
    try {
      if (window.sessionStorage.getItem(SESSION_MARK) === currentPath()) return;
      window.sessionStorage.setItem(SESSION_MARK, currentPath());
    } catch (_) {}

    var count = Number(safeGet(STORAGE_KEYS.visitCount) || 0) + 1;
    safeSet(STORAGE_KEYS.visitCount, String(count));
    safeSet(STORAGE_KEYS.lastPath, currentPath());
  }

  function noteExposure(name) {
    if (!name) return;
    var exposures = safeGetJson(STORAGE_KEYS.exposures, {});
    exposures[name] = Number(exposures[name] || 0) + 1;
    safeSetJson(STORAGE_KEYS.exposures, exposures);
  }

  function setPathway(pathway) {
    if (!pathway) return;
    safeSet(STORAGE_KEYS.pathway, pathway);
    if (pathway === 'member' || pathway === 'supporter') {
      safeSet(STORAGE_KEYS.membershipIntent, '1');
    }
    emitChange();
  }

  function markMembershipIntent(active) {
    safeSet(STORAGE_KEYS.membershipIntent, active ? '1' : '0');
    emitChange();
  }

  function setWorldAffinity(value) {
    if (!value) return;
    safeSet(STORAGE_KEYS.worldAffinity, value);
    emitChange();
  }

  noteVisit();

  window.VSIntentState = {
    getState: buildState,
    setPathway: setPathway,
    markMembershipIntent: markMembershipIntent,
    setWorldAffinity: setWorldAffinity,
    noteExposure: noteExposure
  };
})(window);
