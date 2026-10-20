# Financial implementation review

20 October 2026. Scope: calculation, research and scenario modules and their API/test integration. Fixed point: `764a99a51e1b7c61ba172cea905f4bb9e48af065`; implementation reviewed in the working tree before commit. Earlier Discover/Markets visual reviews remain recorded in `.impeccable/review/`.

## Standards

Reviewer: `/root/finance_standards_review`.

Final verdict: pass. No documented hard-standard violations or material smell findings. Two initial correctness findings were fixed: rounded allocation amounts now respect concentration caps; historical adapters reject duplicate, unordered, non-UTC or gapped daily observations before risk calculations. Targeted regression tests passed. The reviewer found no new material issue in the added policy/evaluation/release/market-evidence modules. Trusted deployment reports are approval records, not proof of model quality.

## Spec

Reviewer: `/root/finance_spec_review`.

Final verdict: implementation fixes pass; empirical acceptance remains incomplete. Independent asset/portfolio scenario gates replace pooled validation, claim/source references survive the response contract, all three horizon branches execute in long-history controls, and the deployment must supply a reviewed strategy rather than receiving an unapproved default basket.

Two acceptance requirements remain externally blocked: no actual skill-enabled versus generic-model comparison has run, and the real historical-data request returned HTTP 401, preventing real-data projection calibration. Recommendation and projection release gates remain closed without the corresponding reviewed records. Unlock schedules, comprehensive incident verification and independent news verification remain limited and explicitly disclosed.

## Validation

- 41 unit/API tests passed across 10 files.
- Typechecking, lint and production build passed.
- Nine existing browser tests passed against the final production build.
- Production portfolio API smoke check returned 20,000 cents across two baseline-only holdings with historical gain correctly null.
- Live specialist and forecasting evaluations were not claimed as passed; synthetic fixtures are not empirical financial evidence.

Final counts: Standards 0 unresolved implementation findings; Spec 0 newly identified blocking implementation defects, 2 incomplete empirical acceptance requirements plus disclosed partial research coverage.
