import { PFR_CAREER_WEIGHTED_PROFILE } from "./profiles/pfrCareerWeightedProfile.js";
import { PFR_RECENT_WEIGHTED_PROFILE } from "./profiles/pfrRecentWeightedProfile.js";

export function getDefaultRealismProfile() {
  return PFR_RECENT_WEIGHTED_PROFILE;
}

export function getDefaultCareerRealismProfile() {
  return PFR_CAREER_WEIGHTED_PROFILE;
}
