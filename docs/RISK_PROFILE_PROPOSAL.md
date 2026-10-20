# Risk profile input proposal

Status: five radio questions, their options, and use before budget-based recommendations approved by the user on 20 October 2026. Browsing remains available without completion. Interpretation and recommendation constraints remain open. Researched 20 October 2026 using TinyFish search and fetch.

## Design basis

Vanguard's investor questionnaire considers objectives, experience, time horizon, risk tolerance, and financial situation. It describes its output as a limited, general asset-allocation guideline rather than comprehensive individual-security advice. This app's proposed asset-specific recommendation function goes beyond that questionnaire's scope.

Schwab distinguishes willingness to take risk (tolerance) from the financial ability to bear losses (capacity). Accordingly, the proposed form asks these separately.

Sources:

- [Vanguard investor questionnaire](https://investor.vanguard.com/tools-calculators/investor-questionnaire)
- [Schwab: How to Determine Your Risk Tolerance Level](https://www.schwab.com/learn/story/how-to-determine-your-risk-tolerance-level)

The wording and buckets below are original design proposals informed by these factors. They are not copied platform options, an adopted platform scoring algorithm, or a validated suitability assessment.

## Approved radio groups

1. **When might you need this money?** Under 1 year / 1–3 years / 3–5 years / Over 5 years / Unsure.
2. **Would losing this amount affect essential expenses or emergency savings?** Yes / No / Unsure.
3. **If $1,000 fell to $800, what would you most likely do?** Sell all / Sell some / Hold and reassess / Unsure. Scale the example amounts to the entered budget. This is a hypothetical scenario, not a maximum-loss estimate.
4. **What is your investment experience?** None / Basic / Experienced.
5. **What investments do you already hold?** None / Crypto / Stocks or funds / Both / Other / Prefer not to say. Exact exposure amounts, if needed for concentration assessment, require a separate question; this group alone does not establish diversification.

## Interpretation decisions still open

- Do not preselect answers that imply investment suitability.
- Do not use one answer or an untested points total to declare an asset suitable.
- All five questions precede personalized budget recommendations. Browsing remains optional-profile. How answers such as Unsure or Prefer not to say affect eligibility remains to be agreed; answering a question does not by itself establish suitability.
- How to handle short horizons, essential-funds needs, uncertainty, and conflicting responses remains to be specified. The system must retain the option of finding no suitable candidate, as proposed in the preceding interview question.
- Low stated risk tolerance must not cause any cryptocurrency to be labeled safe or capital-protected.
- Future stock support requires domain-specific screening and cannot inherit crypto selection rules unchanged.
