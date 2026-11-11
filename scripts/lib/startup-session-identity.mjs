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


// A committed startup brief can outlive its deliberately ignored live lock.
// Validate the committed snapshot without calling its historical owner live.
export function resolveStartupBriefIdentity({ silSession, statusSession, lockText='', briefText='', committedSession=null, committedBriefText=null }={}) {
  const sessions=resolveStartupSessions({silSession,statusSession,lockText});
  const ordinary={expectedSession:sessions.currentSession,lastClosedSession:sessions.lastClosedSession,liveSession:sessions.activeSession,source:sessions.activeSession===null?'last-closed-next':'active-lock'};
  if(sessions.activeSession!==null||String(lockText).trim())return ordinary;
  const rendered=Number(String(briefText).match(/║\s+Session\s+(\d+)\b/)?.[1]);
  if(rendered===sessions.currentSession)return ordinary;
  const declared=String(briefText).match(/generated-at: .*?\(last closed Session\s+(\d+); active\/next Session\s+(\d+)\)/);
  const semantic=String(briefText).match(/<!-- semantic-freshness:[^>]*\bnext=(\d+)\b/);
  const normalize=text=>String(text).replace(/\r\n/g,'\n');
  const published=typeof committedBriefText==='string'&&normalize(committedBriefText)===normalize(briefText);
  if(Number.isInteger(rendered)&&rendered>sessions.lastClosedSession&&committedSession===rendered&&published&&Number(declared?.[1])===sessions.lastClosedSession&&Number(declared?.[2])===rendered&&Number(semantic?.[1])===rendered)
    return {expectedSession:rendered,lastClosedSession:sessions.lastClosedSession,liveSession:null,source:'committed-brief'};
  return ordinary;
}
