import { sessionIdFromLock } from './session-identity.mjs';

// An unfinished arc may have spent a session number without closing it. Keep
// the active lock separate from the last completed SIL entry in every brief.
export function resolveStartupSessions({ silSession, statusSession, lockText = '' } = {}) {
  const valid = value => Number.isInteger(value) && value >= 0;
  const lastClosedSession = valid(silSession) ? silSession : valid(statusSession) ? statusSession : 62;
  const locked = sessionIdFromLock(lockText);
  const activeSession = valid(locked) && locked > lastClosedSession ? locked : null;
  return {
    currentSession: activeSession ?? lastClosedSession + 1,
    lastClosedSession,
    activeSession,
    statusAheadOfSil: valid(silSession) && valid(statusSession) && statusSession > silSession,
  };
}
