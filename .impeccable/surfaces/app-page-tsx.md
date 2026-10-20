# Discover: form-to-allocation design brief

Status: approved for Discover implementation by the user's “implement discover” instruction. Familiar investing-app layout and proposed Wealthfront/StashAway quality references are confirmed. Scope remains Discover; this is not authorization to implement the complete application.

Target: the Discover entry surface, currently `app/page.tsx`, and its dedicated allocation-results view. The final results route is an implementation decision. Related product truth: [PRODUCT.md](../../PRODUCT.md).

## Job and audience

Mode: Operate. A crypto-curious beginner arrives with an amount and preferences and wants an understandable allocation proposal. They complete one grouped form, submit once, and review suggested assets without a chat conversation, questionnaire wizard, or mandatory sign-in.

## Outcome and evidence

Successful analysis produces normally 3–5 assets, with dollar amounts, percentages, concise fit explanations, risks, sources, and timestamps. A completed proposal totals exactly the entered amount and 100%. The user can edit inputs and generate a new proposal. Generating a suggestion never records an investment or executes a purchase.

Platform research supports the profile-to-portfolio interaction pattern, not this app's accuracy. Existing code does not yet provide the specialist allocation service. Preview records must be labeled illustrative; unavailable analysis stays unavailable. See [platform research](../../docs/research/FORM_TO_ALLOCATION_RESEARCH.md) and [allocation architecture](../../docs/adr/0001-form-based-allocation.md).

## Selected direction

The user selected Familiar investing app on Impeccable's direction page. Preserve the arrangement, neutral palette, readable density, and conventional controls of [the chosen sketch](../mocks/decision/canon.html): left app navigation, a main grouped form, and a compact request summary to its right. This is a replacement of the incumbent dark/glowing presentation.

The summary reflects entered inputs, not preliminary recommendations. Sources and deeper reasoning belong in the results view, with concise explanations visible first. The focal action is Generate allocation; the focal result is the reconciled asset allocation list.

Proposed comparator products: Wealthfront and StashAway. The user has not yet confirmed those references; approval of this brief can settle that choice. Their clarity and finish are proposed quality references, not permission to clone branding or proprietary scoring.

## Scope and boundaries

Shape the full Discover journey: input form, validation, progress, results, editing, errors, and guest/signed-in currency states. Navigation includes Discover, Markets, Watchlist, and signed-in Invested; account settings open through a profile circle.

This brief does not implement Markets, purchase accounting, Invested projections, a provider integration, authentication infrastructure, or stocks. It defines how Discover joins those planned capabilities. Preserve existing market/backend behavior outside the redesigned surface unless a separately authorized integration requires a change.

## States and content ranges

- First visit: empty amount, no preselected investment-profile answers, guest USD, optional preferences.
- Form: amount and currency context; optional Additional preferences textbox; all five radio groups and their exact choices from [the approved profile specification](../../docs/RISK_PROFILE_PROPOSAL.md).
- Invalid input: inline messages associated with affected fields and a focusable error summary after submission. Preserve entered answers. No conversational follow-up.
- Generating: truthful progress feedback and duplicate-submission prevention. Preserve a recoverable request; do not display fictitious research stages or percentages.
- Success: asset list, reconciled total, request summary, generation/data timestamps, per-asset evidence and risks, overall limitations, and Edit inputs.
- Missing/stale data, budget exhaustion, or service failure: explicit incomplete/unavailable state with reason and relevant retry/edit action. Do not show a completed partial allocation.
- Unsupported profile or no eligible candidates: reserve a clear unavailable-result presentation; the financial eligibility policy itself remains open and must be resolved before enabling live recommendations.
- Long asset names, long preferences, localization, and 3–5 result entries must not break alignment. Minimum/maximum budgets, currency set, and text-length limits remain implementation/product decisions to document, not silently invented financial claims.

## Interaction and layout

On desktop, keep the grouped form dominant and the input summary secondary. Group amount/preferences and investment-profile questions with clear headings. Submit at the form end. One answer is required per radio group, while Unsure and Prefer not to say retain their approved meanings.

On narrow screens, stack the form and summary, adapt navigation, and keep labels/choices readable and keyboard accessible. Maintain visible labels, focus states, contrast, native form semantics, announced validation/progress, and signed values alongside any status color. Avoid a desktop screenshot scaled down as the mobile experience.

The dedicated results view reuses the app shell and profile summary. Show asset names, amounts, percentages, and short reasons in a consistent order. Deeper risk/evidence expands without obscuring totals. Edit inputs restores the submitted form. Save/watchlist behavior must match the approved guest/account capabilities; a saved proposal remains distinct from holdings.

## Constraints and open decisions

Use the existing Next.js/React/TypeScript/Tailwind application and read the installed Next.js guides before source changes. Build this app screen code-first; the landing/showcase workflow default remains unset. Follow the user's calm neutral-color preference and concise voice. No DESIGN.md or direction contract is created by shape.

Specialist AI supplies sourced research and explanations; deterministic logic validates eligibility, allocation weights, arithmetic, and currency rounding. Respect the 15,000-total-token / 1,500-final-output-token caps. The [draft agent skill](../../docs/agent-skills/crypto-analysis/SKILL.md) is not wired runtime behavior.

Before live financial outputs: settle providers, profile interpretation, unsupported-profile policy, eligible asset catalog, allocation limits, FX rules, and evaluation thresholds. Auth and persistence need a concrete implementation decision. The optional textbox's extraction and conflict handling require specification. This brief does not authorize fabricated outputs while those decisions are open.

## Approval

Approved on 20 October 2026. Implement the scoped Discover flow; missing provider/auth services remain explicitly unavailable.

## Direction contract

THESIS: A beginner completes one legible form and inspects a reconciled allocation; the market ticker does not compete with the task.

OWN-WORLD: Familiar investing-product conventions, cool neutral surfaces, charcoal text, workhorse sans, restrained borders, tabular quantities, and standard accessible controls.

STORY: State an amount and preferences, answer five questions, submit once, then inspect amounts/reasons/risks or recover from an explicit unavailable result. No chat or invented recommendations.

FIRST VIEWPORT: Desktop left navigation, compact top account bar, main form and secondary request summary. Mobile reflows into top navigation and stacked content. Generate allocation sits at the form end. Signature interaction: the live input summary follows edits and returns intact through the result's Edit inputs action.

FORM: User-selected category standard; selected sketch `.impeccable/mocks/decision/canon.html`; seed:f19243a0b847879a. Code-led. Preserve the selected composition while replacing preview-only controls with working semantics.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
