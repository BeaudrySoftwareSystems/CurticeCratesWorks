---
name: Curtis Crates Inventory
description: A power-user inventory tool for a one-warehouse reseller. Linear-lane density adapted to phone-first use. Light, warm-tinted neutrals with one signature burnt-orange accent.
---

<!-- SEED — re-run $impeccable document once there's UI code to capture the actual tokens and components. The frontmatter intentionally has no color/typography tokens yet; real values land on the next scan pass. -->

# Design System: Curtis Crates Inventory

## 1. Overview

**Creative North Star: "The Operator's Workbench"**

A workbench is a tool, not a showroom. Surfaces are clean because the work is what matters; the tool gets out of the way and respects the user's attention. This system is built that way — power-user-first, glanceable on a phone, refusing the SaaS dashboard reflexes that would make it feel like every other Next.js admin panel on the internet.

The personality (per PRODUCT.md): *sharp, technical, precise.* Reference lane is Linear / Raycast / Arc, but adapted away from the dim-room desk laptop and toward a phone held one-handed under warehouse fluorescents. That shift drives a few non-obvious choices that hold the rest of the system together: light-by-default rather than dark, warm-tinted neutrals rather than the cool-grey Linear default, density that respects glance-readability rather than long-staring concentration.

The single concession to color is **Crate Ember** — a saturated burnt-orange that lives on roughly 5–10% of any screen, carrying the meaning of *primary action* and nothing else. It's the heat in the kraft. Everywhere else the system is monochromatic warm-grey, with hierarchy carried by weight, scale, and position. No second accent unless and until a future feature demands a distinct meaning.

This system explicitly rejects:

- The Tailwind/Shadcn default look (card grid + indigo + soft shadows).
- The 2014-enterprise WMS aesthetic (heavy chrome, blue/grey, dropdown-heavy forms).
- The Shopify-admin friendly tone (mascots, illustrations, "Welcome back!" warmth).
- The crypto/web3 dark-neon-glassmorphism vibe (categorically wrong for warehouse work).

**Key Characteristics:**

- Light, warm-tinted by default. Dark as an explicit opt-in for desk use.
- Density over whitespace. The catalog should feel like the user is in command of their inventory, not browsing a brochure of it.
- Geist Sans for everything readable; Geist Mono for everything numeric (SKUs, prices, counts, dates, time).
- One accent, Crate Ember, on ≤10% of any surface. Pure black/white never appear — every neutral is tinted toward the accent's hue.
- Flat by default. Depth comes from surface tone, not shadows.
- Motion is restrained: state changes only, ≤250ms on critical-path actions.
- 48×48px touch targets minimum; primary actions sit in the thumb zone (lower 50% of viewport on mobile).

## 2. Colors

A warm-leaning monochromatic surface (every neutral is tinted toward orange, chroma 0.005–0.01) with one saturated accent. The whole palette is OKLCH-defined; sRGB hex is approximate at extremes and we accept the Stitch linter's warning.

### Primary

- **Crate Ember** *(accent — to be resolved during implementation, target hue ≈40°)*: the only saturated color in the system. Reserved for the primary action of any screen — Mark Sold, Save & continue, Print Label, Scan. Also used on the focus ring. Never decorative; never on a heading or icon for the sake of it. *Ember earns its place by meaning "this is the action."*

### Neutral

- **Workshop Bone** *(default surface — warm off-white, OKLCH ≈98% L / 0.005 C / 60° H)*: the page background and the surface beneath catalog cards.
- **Kraft Mist** *(raised surface — slightly darker warm)*: card backgrounds, modal/sheet surfaces, sticky header.
- **Worn Paper** *(recessed surface — slightly lighter warm)*: form inputs, recessed wells, code blocks.
- **Soot** *(primary text — warm near-black, OKLCH ≈20% L / 0.005 C / 60° H)*: body, headings, any text the user reads.
- **Driftwood** *(secondary text — mid warm-grey)*: metadata, timestamps, helper text under inputs.
- **Smoke** *(tertiary text — light warm-grey)*: disabled, placeholder, low-priority numerals in dense tables.
- **Hairline** *(divider — barely-there warm-grey)*: row separators, table borders.
- **Edge** *(emphasis border — stronger warm-grey)*: input borders at rest, card outlines when hovered.

### Status (single hue per role; chosen for the warm-leaning palette)

- **Signal Red** *(error / destructive)*: validation errors, destructive confirmation. Distinct hue from Crate Ember (cooler, redder) so it never reads as "action."
- **Lantern Amber** *(warning / pending)*: status badges for awaiting / needs attention. Less saturated than Ember.

### Named Rules

**The One-Voice Rule.** Crate Ember covers ≤10% of any rendered surface and means *primary action*. If a second action on a screen needs Crate Ember, demote one of them to a neutral button — the rule prevents two equally-loud calls to action.

**The Warm-Tint Rule.** Pure `#000` and `#fff` are forbidden. Every neutral has chroma ≥0.003 toward the Ember hue. Cool greys read as enterprise; we are not enterprise.

**The Hue-Distance Rule.** Status colors must sit ≥30° away from Crate Ember on the OKLCH hue wheel so a glance can tell *action* from *error* from *warning* without reading the label.

## 3. Typography

**Display Font:** Geist Sans (with `system-ui, sans-serif` fallback)
**Body Font:** Geist Sans (with `system-ui, sans-serif` fallback)
**Mono / Tabular Font:** Geist Mono (with `ui-monospace, SFMono-Regular, monospace` fallback)

**Character:** Geist is the Vercel/Next.js native pair — engineered, neutral, dense at small sizes, calm at large sizes. Geist Mono carries every numeric in the system (SKUs, prices, counts, timestamps) so columns of numerals align in tabular form without effort. The pair is free, OFL-licensed, and naturally at home in this tech stack.

### Hierarchy

- **Display** (weight 600, `clamp(2rem, 5vw, 3rem)`, line-height 1.05): page titles, sign-in screen, empty states. Used sparingly — most pages don't need a display-scale heading.
- **Headline** (weight 600, 24px, line-height 1.2): section headers within a page; item title on the detail screen.
- **Title** (weight 500, 18px, line-height 1.3): card headings, dialog titles.
- **Body** (weight 400, 15–16px, line-height 1.45): descriptive prose, attribute values, helper text. Body line-length capped at 65–75ch where prose runs long.
- **Label** (weight 500, 11–12px, letter-spacing 0.04em, uppercase): field labels above inputs, table column headers, status badges.
- **Mono — Tabular** (Geist Mono, weight 400, 14–15px, OpenType `tnum` enabled): every SKU, display_id, price, count, percentage, date, and timestamp in the system. Numerics are visually distinct from prose at a glance.

### Named Rules

**The Numeric-Mono Rule.** Anything a user might compare across rows — SKU, display_id, price, count, time — is rendered in Geist Mono with tabular numerals. Geist Sans is forbidden for these. The visual distinction is the affordance.

**The Hierarchy-By-Weight Rule.** Hierarchy steps use ≥1.25× scale ratio AND a weight delta. Avoid flat scales where everything sits at weight 400 or weight 600. Display 600 → Headline 600 → Title 500 → Body 400 → Label 500 (uppercase) is a strong rhythm without inventing extra families.

## 4. Elevation

**Flat by default.** Depth in this system is conveyed by surface tone (Workshop Bone → Kraft Mist → Worn Paper) and 1px Hairline borders, not by shadows. Shadows appear only on elements that are physically lifted off the page — popovers, modals, sticky toasts — and even there, they're soft and minimal.

The motion choice (restrained) and the elevation choice (flat) are paired: a system that animates restrained shouldn't be paying for shadow-rendering and shadow-transitioning everywhere. Flat surfaces also read more clearly under variable warehouse lighting; deep shadows look muddy under fluorescents.

### Shadow Vocabulary (used sparingly)

- **Hover Lift** *(`box-shadow: 0 1px 2px oklch(20% 0.005 60 / 0.06), 0 4px 12px oklch(20% 0.005 60 / 0.04)`)*: only on tappable cards on hover/focus. A whisper of separation, not a "card floating off the page."
- **Overlay Lift** *(`box-shadow: 0 4px 16px oklch(20% 0.005 60 / 0.10), 0 12px 32px oklch(20% 0.005 60 / 0.08)`)*: modals, sheets, command palettes. Just enough to read as "above the page."

### Named Rules

**The Tonal-Layering Rule.** Depth comes from surface tone, not from shadow. If a panel needs to feel "elevated" at rest, it gets a darker tonal step (Kraft Mist over Workshop Bone), not a shadow.

**The No-Resting-Shadow Rule.** No element ships with a shadow at rest. Shadows are state — hover, focus, overlay — and clear themselves when state ends. A page with shadows everywhere reads as 2014 SaaS.

## 5. Components

*(Omitted in seed mode — no UI components exist yet. Phase 3 of the implementation plan introduces the catalog list, item detail, intake form, scan flow, and quick-record-sale form. Re-run `$impeccable document` once those land to extract real component tokens.)*

## 6. Do's and Don'ts

The Don'ts here mirror PRODUCT.md's anti-references — the visual spec carries the strategic line forward.

### Do:

- **Do** use Crate Ember for the *primary action* on every screen. Exactly one per screen.
- **Do** tint every neutral toward Ember's hue (chroma ≥ 0.003). Cool greys are forbidden.
- **Do** render every numeric value in Geist Mono with `font-feature-settings: "tnum"`. SKUs, prices, counts, dates, time.
- **Do** place primary actions in the thumb zone (lower 50% of viewport) on mobile, with a 48×48px minimum tap target — larger for Mark Sold, Save & continue, Print Label, Scan.
- **Do** use surface tone (Workshop Bone → Kraft Mist → Worn Paper) to convey depth. Flat at rest.
- **Do** keep transitions ≤ 250ms on critical-path actions (intake, mark-sold, scan). Honor `prefers-reduced-motion` by stripping animations entirely.
- **Do** show the consequence of an action and the way to undo it. A toast "Marked sold • $42 on Depop · Undo" beats a "Are you sure?" dialog.

### Don't:

- **Don't** use indigo or blue accents. They are the Tailwind/Shadcn default and the SaaS-landing reflex.
- **Don't** use a card-everywhere layout. Cards are the lazy answer; nest no card inside another card.
- **Don't** put empty-state illustrations of cardboard boxes, smiley faces, or any "humanizing" art into this system. Empty states are one short sentence and a primary action.
- **Don't** write copy like "Welcome back, Jaden!" or "Great job! 🎉". Voice is matter-of-fact and structural — labels are nouns and verbs.
- **Don't** apply gradient text to numbers, headings, or anything else. Single solid color always.
- **Don't** use side-stripe borders (`border-left` > 1px in a colored accent). They are categorically refused.
- **Don't** reach for glassmorphism (backdrop-filter blurs) as a default decorative choice. Rare and purposeful, or nothing.
- **Don't** use modals as the first thought for any non-destructive action. Inline and progressive alternatives first; modals are the last resort.
- **Don't** add a second saturated color until a v2 feature needs to mean something distinct from "primary action." One accent is the rule.
- **Don't** ship pure `#000` or `#fff` anywhere. Every neutral has warmth.
- **Don't** dress up the inventory tool with "the Tailwind/Shadcn default Next.js dashboard" look — the most insidious failure mode this codebase risks.
