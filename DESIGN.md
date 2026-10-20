---
name: Crypto Prediction — Discover
description: Calm, familiar investing controls for an inspectable allocation request.
colors:
  primary: "#3e5147"
  primary-hover: "#304539"
  primary-disabled: "#6b7970"
  canvas: "#f5f6f5"
  surface: "#ffffff"
  text: "#272e2b"
  muted: "#616b66"
  border: "#dce1de"
  soft: "#edf0ed"
  control-border: "#b7c0ba"
  secondary-border: "#c9d1cc"
  nav-hover: "#f4f6f3"
  selected-text: "#253d2e"
  option-hover-border: "#9ca99f"
  danger: "#9b3830"
  error-surface: "#fff8f6"
  error-border: "#b87e76"
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "2.125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.028em"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 500
  help:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  option: "6px"
  control: "7px"
  error: "8px"
  panel: "12px"
spacing:
  compact: "8px"
  control-gap: "12px"
  inset: "16px"
  mobile-inset: "20px"
  section: "24px"
  panel: "28px"
  page: "44px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "11px 19px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "11px 19px"
    typography: "{typography.label}"
  button-secondary-hover:
    backgroundColor: "{colors.soft}"
  input-amount:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
  radio-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.option}"
    padding: "9px 11px"
  radio-option-selected:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.selected-text}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "28px"
  navigation-active:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "11px 13px"
---

# Design System: Crypto Prediction — Discover

## Overview

**Creative North Star: "Familiar investing workspace"**

The confirmed direction is a calm, clean investing interface: cool neutral surfaces, charcoal text, legible conventional controls, and concise explanations. A restrained grey-green accent identifies actions and selected controls. The visual system supports a beginner completing a form and inspecting its outcome with progressively disclosed evidence.

This record describes the implemented Discover shell and the surfaces that use `components/discover/discover.module.css`, including its request, results, and local saved-proposal patterns. It is an approved replacement world within that boundary. Existing dark Markets and monitor pages remain legacy outside this scope; their global palette, glow, gradients, and fonts are not transformed by this document. Other routes using the Discover shell inherit its visual primitives without implying completed account or investment capabilities.

Source authority is the current Discover stylesheet and components. The selected code-led reference is `.impeccable/mocks/decision/canon.html`; desktop, mobile, unavailable, and synthetic results/evidence screenshots in `.impeccable/review/` corroborate the layout. Those screenshots are review evidence, not shipping raster assets or live financial analysis. Current source and refreshed screenshots show sign-in and currency settings as unavailable, without a redundant issue eyebrow.

**Key Characteristics:**
- Cool neutral canvas and white, bordered panels.
- Shared workhorse sans typography and tabular monetary quantities.
- Conventional labeled inputs, native radios, and visible keyboard focus.
- Flat surfaces with concise text and inspectable evidence.
- Authored inline SVG icons; no shipping raster imagery.

## Colors

The palette is predominantly cool neutral, with a muted grey-green action color and a reserved red for validation.

### Primary

- **Grey-green action** (`primary`): primary actions, text actions, radio selection, caret, and focus outlines. The hover and disabled variants express interaction state.

### Neutral

- **Cool canvas** (`canvas`): the workspace behind content.
- **White surface** (`surface`): navigation, top bar, form, request summary, result rows, and menus.
- **Charcoal** (`text`): headings, field values, and primary reading text.
- **Slate grey-green** (`muted`): descriptions, metadata, optional markers, and unselected navigation.
- **Fine divider** (`border`): panel outlines and internal separators. Stronger control and secondary-button borders distinguish input affordances.
- **Soft neutral** (`soft`): active navigation, selected options, totals, and progress notices.

Validation uses `danger` text with the pale error surface and muted error border. Color accompanies explicit messages and selected native controls.

**The State With Meaning Rule.** Color reinforces a labeled action, selection, or message; it does not replace the text or control state.

## Typography

The Discover shell explicitly sets the system sans stack recorded in the frontmatter. This overrides the root layout's legacy Space Grotesk body treatment; JetBrains Mono is not used for Discover quantities. Headings share the body family rather than introducing a separate display face.

### Hierarchy

- **Headline:** page headings use the headline token; narrow layouts reduce them to (1.75rem).
- **Title:** section headings use the title token. Asset titles use (16px), summary headings (15px), and evidence subheadings (14px), all with semibold weight.
- **Body:** shell text uses the body token; form descriptions and result explanations commonly use (14px). Result reasons use a generous line height (1.75) with a maximum measure (72ch).
- **Label:** field labels and button text use medium weight; radio labels and text actions use (13px). Help text uses the help token; timestamps and footer text use (11px).
- **Quantities:** tabular numerals align budget, allocation, totals, and character counts. The amount input uses (21px); allocation values use (18px), with totals at (19px).

**The Shared Voice Rule.** Use one sans family, sentence case, concise labels, and explicit units; establish hierarchy through size, weight, and spacing.

## Layout

Desktop uses a navigation rail (218px) beside a flexible workspace. A white top bar (minimum 76px) precedes a centered content area (maximum 1420px) with desktop padding (38px 44px 60px). The main content grid gives the form or result the flexible column and the request summary a secondary column (290px), separated by (26px). The form summary wrapper is sticky (26px from the top); the results summary is not sticky.

At (1190px and below), the rail narrows to (190px), content padding becomes (30px), and the summary column becomes (250px) with a (20px) gap. At (1000px and below), the summary follows the primary content in a single column. At (760px and below), the rail becomes top navigation with four equal items, the top bar becomes at least (60px), and content padding becomes (29px 22px 40px). At (400px and below), content side padding reduces to (15px), field hints wrap, and allocation values can move beneath the asset identity. At (1700px and above), content side padding increases to (60px).

Form panels use (28px) padding on desktop, reducing to (24px) and then (23px 20px). Options wrap naturally with (8px) gaps rather than shrinking their text. Long preferences, asset names, and source content wrap within their columns. Coarse pointers raise compact action targets to at least (44px) and input text to (16px).

## Elevation & Depth

Discover uses no box shadows or backdrop blur. White surfaces, soft fills, fine borders, and whitespace establish depth. The profile menu overlays content through positioning and stacking, retaining the same quiet border language. The only repeating motion is the truthful pending-request dot (1.4s opacity pulse); small control transitions use (120–130ms ease-out). Reduced-motion preferences disable animation and transitions.

**The Flat Surface Rule.** Separate content through tone, borders, and spacing; keep the scoped Discover surface free of legacy glow and glass treatments.

## Shapes

Panels and the profile menu use gently rounded corners (`panel`), controls and navigation use the smaller `control` radius, and radio option wrappers use `option`. Fine borders define containers without heavy outlines. The profile trigger, guest avatar, native radio, and asset initial are circular. Unavailable states use a softly rounded square icon container (58px square, 13px radius). Icons are authored inline SVG strokes, and asset initials remain text rather than fabricated brand imagery.

## Components

### Buttons

Primary actions are solid grey-green with white medium-weight text. Primary and secondary buttons share a minimum height (44px), padding (11px 19px), and a (12px) icon gap. The form's Generate allocation button spans its panel width. Secondary actions have a white background and a fine stronger border. Text actions use the primary color and underline on hover. Disabled buttons use their implemented muted treatment and do not imply availability.

Keyboard focus uses an accent outline (2px) with an offset (4px); the amount wrapper and radio wrapper use a closer offset (2px). There is no translated, lifted, or scaled active-button treatment.

### Inputs / Fields

Visible labels, optional/required markers, and compact supporting text accompany fields. The amount wrapper is at least (54px) high, with a separated USD prefix and tabular input. Preferences use a resizable white textarea with (12px 14px) padding and height limits (90px–420px). Invalid fields pair a danger border with associated text. A focusable error summary links to affected fields; entered values remain intact.

### Radio options

These are native radio inputs inside lightly bordered, gently rounded label wrappers, not removable chips. Each option uses (9px 11px) padding and a minimum height (42px), raised to (44px) for coarse pointers. Hover strengthens the border. Selection adds the soft fill, action-color border, selected text, and native checked state. Group legends remain visible and choices wrap.

### Cards / Containers

White panels use a single fine border and the panel radius. Dividers separate summary rows, sections, and result rows. The request summary is a definition list with muted terms and right-aligned values; preferences switch to a full-width wrapped row. Its subdued next-step inset explains the transition without presenting preliminary recommendations.

### Navigation and profile

The desktop rail uses icon-and-label links with (46px) minimum height and a soft active fill. Hover uses the neutral hover surface; active links also become semibold. Mobile navigation stacks icon above label in four equal columns. The circular profile trigger opens a bordered native disclosure menu with guest USD context and local saved-proposal access. Account and currency settings remain explicitly unavailable in the current build.

### Allocation and evidence

Result rows align an initial, asset identity, concise reason, monetary amount, and percentage. A soft total row reinforces the reconciled distribution. Native disclosures reveal risks, underlined source links, observation timestamps, methodology, and limitations; their chevron rotates when open. Following and saving describe device-local behavior. Synthetic review records demonstrate this presentation and are not production recommendations.

### Progress and unavailable states

Pending requests use a subdued notice, pulsing dot, status text, and cancel action. Unavailable results preserve the request summary and present a clear heading, reason, and relevant edit/retry action. They show no asset choices or amounts without verified analysis. These states use the same neutral panels and concise voice as the form.

## Do's and Don'ts

### Do:

- **Do** apply this system within the Discover shell boundary and check the actual stylesheet when extending it.
- **Do** pair every monetary figure with clear units and use tabular numerals for aligned quantities.
- **Do** preserve native control semantics, visible labels, wrapping choices, and visible keyboard focus.
- **Do** keep request inputs, suggested allocations, and recorded investments clearly distinguished.
- **Do** describe pending, unavailable, and device-local states accurately and concisely.

### Don't:

- **Don't** infer that legacy Markets and monitor pages have adopted this visual system.
- **Don't** carry legacy dark gradients, glass panels, or glow into the scoped Discover surfaces.
- **Don't** imply that account settings, live allocation analysis, or numerical recommendations exist when the build reports them unavailable.
- **Don't** ship review screenshots or synthetic allocation records as product imagery or financial evidence.
- **Don't** use status color as the sole explanation of a state.
