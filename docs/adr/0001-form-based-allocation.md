---
status: accepted
---

# Generate allocations from a form with separate research and allocation responsibilities

The user requires a beginner-facing budget-and-preferences form that produces a fully allocated asset list without chat or conversational follow-ups. Following research into questionnaire-based investing platforms, we chose structured inputs → assessed profile → constrained allocation → results, with specialist AI supplying sourced asset research and explanations while a defined allocation engine calculates weights and reconciles dollar amounts; this preserves domain depth while making constraints and arithmetic reproducible.

Completed proposals allocate 100% of the entered budget; missing inputs are validated inline and unavailable data produces an explicit error. This decision replaces conversational discovery and unconstrained model-generated allocations; it does not select a proprietary competitor score, a specific allocation algorithm, or a policy for profiles that have no supported strategy.

Accepted 20 October 2026. Research: [form-to-allocation comparison](../research/FORM_TO_ALLOCATION_RESEARCH.md).

## 21 October 2026: explicit experimental AI proposals

The user clarified that submitting Discover should let AI propose coins from current trends and relatively lower-risk options, rather than requiring an administrator to supply a fixed basket. The opt-in `DISCOVER_AI_RECOMMENDATIONS_ENABLED` mode therefore allows model-proposed weights from dated evidence. Server code still owns eligible identities, concentration constraints, validation and exact monetary arithmetic. Results state that human specialist evaluation is incomplete; no approval is inferred or fabricated. Disabling this mode restores the reviewed fixed-strategy workflow. Invested reviews and projection release checks are unchanged. See [setup and limitations](../OPENAI_DISCOVER_SETUP.md).
