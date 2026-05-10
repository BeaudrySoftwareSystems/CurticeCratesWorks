# Product

## Register

product

## Users

Two-to-three person team running a reseller warehouse:

- **Justin** (owner / engineer): the primary builder of this tool and one of its daily users. Power user. Comfortable with keyboard shortcuts, dense data, command-driven UI. Uses the tool from a phone on the warehouse floor and from a laptop at the desk.
- **Jaden** (warehouse staff): handles intake, photographs items, applies labels, picks for shipping. Phone-first user. Often has a garment, a Pokémon box, or a packing slip in one hand and the phone in the other. Possibly gloved. Mixed lighting (warehouse fluorescent + daylight + occasional dim corners).
- **Future contractors** (occasional): onboarded short-term to do focused intake or relisting work. Need to be productive within minutes of being added to the allowlist.

The job to be done: get an item from "just arrived" to "in the catalog with a printed barcode label, photographed, located on a rack" as fast as possible. And later: when something sells, mark it sold reliably, on whatever device is at hand, in under a minute.

## Product Purpose

The **physical-inventory + intake system of record** for Curtis Crates' Depop / Poshmark / eBay reselling business (clothing + Pokémon products). v1 deliberately does not handle cross-platform listing or delisting — that's v2. v1 owns *what exists, where it is, and when it sold*.

Success looks like: every item flowing through the warehouse gets a record, intake is measurably faster than the current manual baseline, the printed barcode scans back reliably, and marking an item sold is one primary tap.

This is **not a SaaS** and is not built like one. Single-tenant, internal-only, two users today, optimized for cognitive load and time-to-using-it rather than for scaling onboarding or marketing.

## Brand Personality

Three words: **sharp, technical, precise.**

The reference lane is Linear / Raycast / Arc — power-user tools that feel engineered, that respect their user's attention, and that don't waste pixels on chrome or mascots. Adapted here to a phone-first warehouse context rather than a knowledge-worker desk.

Voice: matter-of-fact, structural, occasionally dry. Labels are nouns and verbs, not marketing copy. No exclamation marks. No "Welcome back!" No empty-state illustrations of cardboard boxes with smiley faces. Status copy reads like a console log: "23 items stocked", "Sold: $42 on Depop", not "Great job! You've sold an item! 🎉".

Emotional goals: *competent confidence* (the user feels capable, not coddled), *quiet density* (a lot of information, calmly arranged), *trust the user* (no second-guessing dialogs, no "are you sure?" on every action — surface real consequences, then act).

## Anti-references

Things this should explicitly not look like:

- **Generic SaaS dashboard.** The Tailwind/Shadcn default — card grid + sidebar nav + soft shadows + indigo accent. Looks AI-generated. Looks like every Next.js starter on the internet.
- **Enterprise inventory / classic WMS** (SAP, NetSuite, ShipStation circa 2014). Heavy chrome, dropdown-heavy forms, blue/grey palette, dense in a *tired* way rather than a *precise* way. Designed for a 27-inch monitor and a mouse, not for someone holding a phone with one hand.
- **Consumer e-commerce SaaS** (Shopify-style admin). Bright friendly illustrations, mascots, "Welcome to your store!" onboarding wizards, marketing-shaped tone. Wrong register entirely for an internal tool used by two people.
- **Trendy crypto / web3 dark-mode neon.** Black-background + neon-green/purple, glassmorphism, gradient nonsense, vibe over function. Categorically wrong for warehouse work.

Specific reflexes to refuse:

- Indigo / blue accent because it's the Tailwind default.
- Decorative gradient on hero numbers ("$1,234" with a gradient fill).
- Soft pastel "humanizing" the UI.
- Card-everywhere layout (cards are the lazy answer).
- Empty-state illustrations of any kind.

## Design Principles

1. **Speed-to-action, not speed-to-learn.** Users will use this tool every day. Optimize for the 100th use, not the first. Less hand-holding, more shortcuts. Power-user defaults; no onboarding wizards.
2. **Data dense, not data hidden.** Linear-style. Show information; don't apologize for it with whitespace. The catalog should feel like the user is in command of their inventory, not browsing a brochure of it.
3. **One purposeful accent.** Restrained color strategy: tinted neutrals plus a single accent that means *something* (sold? action?). The accent earns its place by carrying meaning, not decoration. No second accent unless it carries different meaning.
4. **Physical-first interaction.** The primary surface is a phone held one-handed in a warehouse — possibly gloved, in mixed lighting, with the user's attention split between the screen and a physical item. Touch targets, contrast, and copy weight are all tuned for that — not for a desk monitor.
5. **Trust the user; surface consequences, not confirmations.** Don't ask "are you sure you want to mark this sold?" Show the consequence (the action that just happened, the way to undo it) and move on. Confirmations belong on truly destructive multi-record actions, nothing smaller.

## Accessibility & Inclusion

- WCAG 2.2 AA contrast as a floor, AAA where it doesn't fight density (body text, primary actions).
- Touch targets ≥ 48×48 px on mobile; larger on primary actions (Mark Sold, Print Label, Save & continue) which are routinely tapped with gloves on. Thumb-zone placement (lower 50% of viewport) for these.
- Keyboard navigation parity on the desktop catalog; primary actions reachable without a mouse.
- Reduced-motion: honor `prefers-reduced-motion`. Animations are subtle by default; reduced-motion strips them entirely rather than swapping for half-strength alternatives.
- Color is never the only signal. Status badges combine color + label + position. Icons combine glyph + label.
- No animations longer than ~250ms on critical-path actions (intake, mark-sold, scan). Speed is the accessibility feature warehouse users need most.
