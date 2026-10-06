# Desk signup follow-through

Agent edge acceptance: exact POST `/desk/dispatch/subscribe` now accepts curl, requests, Go and wget clients with valid CSRF. Scanner tooling, other writes, private routes and missing CSRF remain denied. Focused newsletter suites pass 23/23. Staging Worker `6d53c546-cef2-4969-b4b3-d98141b91e31` returned structured400 for a malformed email submitted using a real curl User-Agent and signed CSRF; no email was sent. The prior full-check run was intentionally stopped at155/530 to apply this contract correction, and does not certify the final source.

Founder reports the regular Desk signup worked correctly. New requested follow-through removes newsletter Turnstile friction for humans and AI agents, preserves email double opt-in, and adds recipient24h/globalUTC100 send limits inside the email function so direct callers cannot bypass them. Premium confirmation HTML/plain-text emails include signed cancel/unsubscribe links and one-click headers; daily digest masthead is upgraded. The welcome page has a colorful moving sphere, newsroom/profile/feed links, seven themes, reduced motion and explicit unsubscribe/error states. Scoped canonical staging verified145 HTML/art/discovery files; newsletter backend deployed with no-send6/6 and real database rollback assertions passing. Production Worker/Pages publication of this follow-through is pending final checks.

Focused checks: newsletter backend7/7; signup edge5/5; durable limiter3/3; deployment verifier7/7; CTA25/25; digest43/43; agent manifest36/36; TypeScript check passes. Independent release review passes. Real SQL rollback assertions verify recipient cooldown, daily cap, cutoff and denied public RPC access; no test records or emails remain. CANON053:70 hash-bound welcome captures across seven themes at1366/390, all four states, plus four email previews.


### S369 newsletter production edge acceptance

Newsletter production Worker d12535f4-a4a9-4baf-ab41-03c4a502102a deployed after11/11 release-ceremony checks. An actual curl-User-Agent POST with valid signed CSRF returned400 invalid_email without a challenge or email send. Independent edge review passed84/84; newsletter suites23/23. Current homepage mobile regression passed5/5 widths; unchanged210 prior cells were retained only after exact source/capture hash checks. Frontend publication remains pending until the confirmed Pages content deployment lands. New-template mailbox delivery remains unverified.


### S369 final newsletter publication

Newsletter follow-through is published: source d607927ec56d1a3bda4b57856b9ae917c70388ea, confirmed Pages run37548337150 (successful actual deploy), production Worker d12535f4-a4a9-4baf-ab41-03c4a502102a after11/11 ceremony checks. The uninterrupted full suite passed530/530, with zero secret findings. Live desktop1366/mobile390 welcome screens were captured and inspected; the served content head matches, all newsletter challenge slots are absent and the human/agent contract is available. Backend recipient/global limits, premium confirmation/plain-text emails and signed cancellation are deployed; the digest design is updated. No extra real emails were sent. Founder confirmed the prior regular signup; delivery/rendering of the upgraded email in a real mailbox remains unverified. All four temporarily paused publishers are active again. Existing identity holds remain separate.
