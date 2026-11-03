<!-- Session 409 · source: docs/AUDIT_2026-11-03-S409-access.json -->
# Separate the Vault Member and premium Investor Relations journeys

The initial two repairs remain verified locally. This is the explicit same-session founder scope extension, never a new arc.

Wave1 fresh startup/audit complete. Wave2 initial repairs complete; expanded account experience in progress. Wave3 release/closeout pending in docs/RELEASE_S409.json.

## 1. member-account-experience — L2
Create a branded two-audience entry, redesign member sign-in/create/profile-completion states, preserve referral and return intent, and present invite requirements honestly. Keep Obelisk credentials and existing membership policy authoritative.

Acceptance: Real browser sign-in/create/profile/recovery states are readable and navigable across all seven themes and desktop/mobile; current authenticated member and invited onboarding journeys return to the correct member context.

## 2. premium-investor-experience — L2
Create a premium institutional investor entrance and consistent workspace shell across all subpages. Separate identity creation, investor access request and approval; consolidate the application into its existing route; preserve safe investor destinations and accurate browser submission confirmation. Do not change approval tiers, permissions or financial/private data.

Acceptance: All investor routes and states receive real rendered review across themes and viewports. Existing approved investors retain exact deep links; signed-in ordinary members can request access without logout or investor data; application failure/retry/confirmation is accurate without inventing server status.

## 3. audience-safe-auth-recovery — L2
Preserve trusted initiating intent and audience in the existing signed flow. Use a neutral audience chooser when no trusted flow survives; preserve fail-closed state, nonce, PKCE and access gates. Verify provider-supported signup behavior before promising it; coordinate owner dependencies through Ark.

Acceptance: Regression tests prove cancellation, provider errors, expiry, invalid state and hostile return targets remain fail closed with correct audience recovery. Affected real authorized member/investor/private-data journeys are required separately; anonymous denials and fixtures do not substitute.

Ownership: root owns member/chooser/edge; investor lane owns investor-portal pages and investor-specific assets; reviewer owns read-only independent checks. No shared-file writes by investor lane.

Rollback: revert the experience changes via a new candidate, retain previous full Pages and Worker deployments. Existing signed flow, identity authority, approval/RLS, tiers and entitlement policy remain intact.
