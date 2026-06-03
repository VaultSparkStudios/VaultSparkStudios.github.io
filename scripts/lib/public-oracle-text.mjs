const REPLACEMENTS = [
  [/\bcommit counts?\b/gi, 'signal counts'],
  [/\bcommits?\b/gi, (match) => match.toLowerCase().endsWith('s') ? 'signals' : 'signal'],
  [/\bblocker counts?\b/gi, 'friction signals'],
  [/\bblockers?\b/gi, (match) => match.toLowerCase().endsWith('s') ? 'friction points' : 'friction point'],
  [/\binternal scoring\b/gi, 'studio scoring'],
  [/\binternal\b/gi, 'studio-side'],
  [/\bHuman Action Required\b/gi, 'Founder review needed'],
  [/\bHUMAN ACTION\b/gi, 'FOUNDER REVIEW'],
  [/\bHUMAN\b/g, 'FOUNDER'],
  [/\bhuman-blocked\b/gi, 'founder-review'],
  [/\boperator vocabulary\b/gi, 'studio vocabulary'],
  [/\boperator\b/gi, 'studio'],
];

export function sanitizePublicOracleText(value) {
  if (typeof value !== 'string') return value;
  return REPLACEMENTS.reduce((text, [pattern, replacement]) => {
    return text.replace(pattern, replacement);
  }, value);
}

export function sanitizePublicOracleVoice(voice) {
  if (!voice || typeof voice !== 'object') return voice;

  const next = { ...voice };
  next.quote = sanitizePublicOracleText(next.quote);
  next.tone = sanitizePublicOracleText(next.tone);

  if (next.evidence && typeof next.evidence === 'object') {
    next.evidence = { ...next.evidence };
    next.evidence.regimeRationale = sanitizePublicOracleText(next.evidence.regimeRationale);
    next.evidence.topRecommendation = sanitizePublicOracleText(next.evidence.topRecommendation);
  }

  return next;
}

export function sanitizePublicOracleProject(project) {
  if (!project || typeof project !== 'object') return project;

  return {
    ...project,
    currentFocus: sanitizePublicOracleText(project.currentFocus),
    nextMilestone: sanitizePublicOracleText(project.nextMilestone),
    voice: sanitizePublicOracleVoice(project.voice),
  };
}

export function sanitizePublicOracleFeed(feed) {
  if (!feed || typeof feed !== 'object') return feed;

  const next = { ...feed };

  if (Array.isArray(next.projects)) {
    next.projects = next.projects.map(sanitizePublicOracleProject);
  }

  if (next.voices && typeof next.voices === 'object') {
    next.voices = Object.fromEntries(
      Object.entries(next.voices).map(([key, voice]) => [key, sanitizePublicOracleVoice(voice)])
    );
  }

  return next;
}
