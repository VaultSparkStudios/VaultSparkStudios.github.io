<!-- Session 413 · source: docs/AUDIT_2026-11-09-S413-release-brand.json -->
# Required copy-gate false positive

1. release-news-brand-falsepositive — L2. Add only the normalized KEXAONE proper-brand token to the existing brand/acronym vocabulary. Preserve the all-caps rules and article wording. Add a regression for K-EXAONE-2.5 and a near-name negative control; verify the full current corpus and existing self-tests. This is a narrow required-release check repair, not a new editorial or model-adoption outcome.

Evidence: actual failed step363 in private S413 diagnostic; official LG AI Research naming https://www.lgresearch.ai/news/view?seq=678 and https://github.com/LG-AI-EXAONE/K-EXAONE. These establish brand spelling, not every claim in the article. Root owns the narrow checker edit and validation; other arc outcomes remain open.
