# Curtis Crates Inventory Management System — Requirements

**Date:** 2026-05-09
**Status:** Brainstorm — refined after two document-review passes; ready for `/ce-plan`
**Owner:** Justin Beaudry
**Source material:** Today's Monologue notes (4 notes, 2026-05-09 22:38–23:20 UTC)

## Problem

Curtis Crates resells clothing and Pokémon products across multiple online platforms (Depop, Poshmark, with eBay under consideration). The current operation has three compounding pains:

1. **Cross-platform inventory drift.** A single item is listed on multiple platforms at once. When it sells on one, the others must be delisted manually. Misses cause double-sales, refunds, and customer-experience damage.
2. **Manual sale tracking.** When something sells, someone physically writes the item name and number to track it. There is no system of record for what was sold, when, or where it lived.
3. **Disorganized warehouse retrieval.** Items live in numbered boxes; the assignment between item, box, and rack location is fragile. The previous "B001"-style rigid box system was specifically called out as broken — large boxes constrain what can fit and lock items into place.

The brainstorm explicitly excludes two adjacent, separate projects mentioned in the same notes: the Pokémon purchase-bot (Walmart/Target scraping + auto-checkout), and the multi-account e-commerce monitoring system. Those are independent systems that may eventually integrate via this system's API but are not part of this scope.

## Goal

Build the **physical-inventory + intake system of record** for Curtis Crates: what we own, where it is, what it cost, and a record of when it sold. Out of band today — and for v1 — is anything that *originates on a sales platform*: live listing state, real-time sold-on-platform-X events, and the action of pushing or pulling listings across Depop/Poshmark/eBay. Those belong to **cross-platform sync** (umbrella for two distinct work items: *listing creation* and *delisting-on-sale*), which is a clearly-named v2 milestone. Calling v1 a "source of truth for listing/sold state" would be aspirational at best, since those events happen on systems v1 does not observe — so the goal language is deliberately narrowed.

## Users (day one)

Single tenant, Curtis Crates only. Users are Justin and warehouse staff (Jaden, etc.) operating from a phone or laptop on the warehouse floor. No outside customers, no SaaS billing, no public marketing site.

v1 is built explicitly as an **internal tool optimized for cognitive load and time-to-using-it**, not as a SaaS-shaped foundation. No `org_id` columns on the schema. No multi-tenant accommodations. If a SaaS pivot ever happens, v2 will pay for the migration then — the cost of carrying multi-tenant ceremony for one user today is higher than the cost of a future migration.

## Success criteria

The first release is successful if all four are true:

1. Every item that flows through the warehouse from launch onward has a corresponding record in the system, with photos, attributes, location, and status. (Note: cold-start strategy is *lazy intake on next-touch* — the system does not need to start at 100% inventory coverage on day one. See *Cold-start* below.)
2. Adding a new item to the system, including printing its label, is **measurably faster than the current baseline intake process**. The current baseline must be timed during planning (with Jaden, on a typical garment) and recorded; the v1 target is "faster than baseline by at least the time it takes to write the item ID by hand." The 90-second number was a placeholder with no anchor and is removed.
3. The barcode on the printed label scans back into the item record reliably (10 of 10 scans).
4. When an item sells, marking it sold in the system is a single primary action and updates the record immediately. Cross-platform delisting is *expected* to be manual at this stage — that is v1's intended scope, not a deficiency.

## Scope

### In scope (v1)

- **Item catalog with runtime-extensible category/attribute system.** A generic `item` core (id, internal SKU/number, photos, location, status, cost, list price, timestamps) plus a `categories` registry and per-category typed attribute definitions. Each category (Clothing, Pokémon Sealed, Pokémon Single, etc.) declares its own typed attributes; a new category can be added without code changes (categories and attribute definitions are data, not code). **Note this is a deliberate complexity bet:** the runtime-extensible system is the most expensive part of v1 and is in tension with the "internal tool, optimize for cheap" identity. The bet is that category churn will outpace the cost of EAV-shaped queries; if that turns out to be wrong by v2, two concrete typed schemas (Clothing and Pokémon) is a clean fallback. The v1 admin surface stays minimal: categories defined via seed data or a small admin form, *not* a full schema editor.
- **Photo capture.** Multiple photos per item, taken on a phone. Photos with measurement rulers (pit-to-pit, inseam) are a normal case for clothing, not a special feature — the system stores them as ordered photos with optional captions. Storage details deferred to planning.
- **Locations as free-form strings, with optional structure.** Each item has a `location` text field (e.g. `A-12`, `shelf by door`). Users can also register known locations as first-class records, and an item can either reference a registered location or use a free-form string. This avoids the rigid B001 box system while supporting picking-by-rack views later.
- **Barcode + label printing.** Each item has a unique scannable barcode encoding its internal ID. Labels are printed on Jaden's JADENS 268BT Bluetooth thermal printer. The MVP prints a single label format (item ID, short title, key attributes, barcode) on demand from the item view.
- **Mark as sold.** A single action on the item record sets status to sold and captures sold price, platform sold on, sold date, and optional buyer reference. The platform field is a closed enum for v1: `Depop`, `Poshmark`, `eBay`, `Other`. The platform field is **nullable** — staff may know the price and date before they know which platform the sale came from (especially for staff-observed sales without a platform notification yet). `Other` means "not one of the three named platforms"; an unset/null value means "not yet known." No cross-platform delisting in v1 — the system records *which* platform a sale happened on as data, but does not act on the other platforms.
- **Quick-record-sale path (for uninbound items).** During the cold-start window (and indefinitely thereafter, for slow-moving long-tail inventory that never went through intake), items will sell that have no record in the system. v1 includes a separate flow: "Record a sale of an item not in the system." It captures sold price, sold date, platform (nullable, same enum as above), and an optional short title or category. It creates a minimal `sold` record with no photos and no location. This is intentionally skinny — the goal is to close the data gap on sales coverage, not to backfill full catalog records. These records are flagged as `intake_skipped` so future analysis can distinguish them from full-lifecycle items.
- **Mobile-first web UI.** Phone-friendly intake flow (camera → attributes → location → print). Desktop-friendly catalog and detail views.
- **UI uses Next.js Server Actions; no separate JSON API surface in v1.** v1 has zero non-UI consumers (the purchase-bot and monitoring system are explicitly out of scope), so building an external HTTP API for hypothetical future agents is unjustified ceremony for this release. The intake, mark-sold, and admin actions are Server Actions invoked directly by the React UI, with all auth/validation enforced server-side. When a real second consumer appears, we add a small `/api/v1` Route Handler layer at the seam where a Service is already isolated — the layered architecture (Handler → Service → Repository) makes that a one-file-per-endpoint addition, not a rewrite. This is an explicit deviation from the project-default "API-first" convention, justified by the single-consumer reality of v1.

### Out of scope (v1, but designed-around)

- Cross-platform listing creation (Depop, Poshmark, eBay).
- Cross-platform delisting on sale.
- AI-generated listing descriptions and images.
- "AI Generative Optimization" (AGO) keyword tooling.
- Pokémon purchase-bot integration.
- Multi-account purchase monitoring integration.
- Full SaaS multi-tenant onboarding, billing, and marketing site.

These are not "designed around" by adding speculative scaffolding to v1. v1 is honestly minimal: when sync, AI listing generation, or external consumers become real, expect a focused additive change (likely including a real `listings` child entity that v1's flat `list_price` column does not yet model). That is the right cost to pay later, not now.

### Explicit non-goals

- Replacing the current outsourced listing workflow. Items can leave the system (export, send-to-lister), come back relisted, but generating listings is a separate problem.
- A full WMS (warehouse management system) with picking routes, wave planning, etc. Scope is a smart catalog with locations, not a logistics platform.

## Workflow this enables (intake → sold)

1. Item arrives at the warehouse.
2. Staff opens the system on a phone, taps "New item", picks a category.
3. System assigns a unique internal ID and renders the intake form (core fields + that category's attributes).
4. Staff takes photos directly in the app, fills in attributes, sets a location string, sets cost.
5. Staff taps "Print label" — a label with the barcode and short summary is sent to the JADENS printer.
6. Staff applies the label to the bag/sleeve/box and places the item at its recorded location.
7. (Outside the system in v1) Item is listed on whatever platforms the team chooses.
8. When the item sells (signal arrives via email, platform notification, or staff observation), staff opens the item (by scan or search), taps "Mark sold", enters sold price + platform.
9. The item is now in `sold` status. Staff retrieves it from its location for shipping.

## Build-vs-buy

Mature SaaS exists for cross-listing and delisting (Vendoo, List Perfectly, Crosslist) that would address pain #1 today, faster than any build. The decision to build instead is deliberate, justified by three things that no off-the-shelf reseller tool provides:

1. **Data ownership.** Curtis Crates retains full control over its catalog, photos, cost basis, and sale history. SaaS reseller tools own that data on their infrastructure and offer limited export.
2. **Preserves the option to add an agent / API integration surface in v2 against a model we own.** v1 itself does not deliver this — the API surface is explicitly v2 work — but owning the data model and Service layer means a future Route Handler addition is one-file-per-endpoint, not a rewrite. Off-the-shelf SaaS tools foreclose that path. (This is a future-option pillar, not a v1 capability.)
3. **MRR pivot foundation.** If the system later gets repackaged as a SaaS for other resellers, owning the codebase and data model is the foundation that pivot rests on. SaaS-on-SaaS does not work.

A SaaS subscription remains a viable interim solution for cross-platform sync (the v2 work item) until v2 ships. v1 does not preclude using one.

## Cold-start strategy

v1 launches with an **empty catalog**. There is no big-bang import of existing inventory.

- **Lazy intake on next-touch:** as staff handles each existing item (relisting, photographing, picking, restocking), they intake it then. Day-one inventory coverage starts at 0% and grows naturally as items move through the warehouse.
- **No upfront migration work.** No CSV import view in v1. The team does not stop physical operations to populate the system.
- **Trade-off:** the system does not represent total inventory until weeks/months of normal operation have passed. Until then, "is item X in the system?" is not a guaranteed-yes question. This is acceptable because v1's goal is to be the system of record for items *going forward*, not for historical state.

## Architecture and tech anchors

- **Stack:** Next.js (App Router) on Vercel + Neon Postgres + Drizzle ORM + TypeScript strict, per project standards.
- **Layering:** Server Action / Route Handler → Service → Repository / Gateway. The Service layer is the seam — Server Actions in v1, Route Handlers added in v2 if/when a real external consumer appears. Repositories are the only thing that touches Drizzle.
- **Server Components by default**, Client Components only where needed (camera, barcode scan, label-share trigger).
- **Generated code is never hand-edited**, per project rules.

The label printer is the only non-trivial integration question. The JADENS 268BT is a Bluetooth thermal printer; the **actual GATT service / wire protocol is unconfirmed** — JADENS-branded BT printers commonly use a vendor raster bitmap protocol over a custom BLE service rather than ESC/POS. **Verifying the protocol on Jaden's specific device is a planning prerequisite** (not deferrable past planning), because it determines whether Web Bluetooth is even feasible.

Plan-time decision tree:

- If the protocol is openly documented and supported in browser BLE, evaluate render-and-share *vs.* Web Bluetooth on actual measured intake throughput.
- If the protocol is vendor-proprietary or undocumented, **render-and-share via the JADENS companion app is the only realistic path**, and v1 should ship with that single codepath.

The default expectation for v1 — until verification proves otherwise — is **render-and-share only**. The dual-codepath "Web Bluetooth opportunistically with fallback" approach is rejected for v1: three of seven reviewer personas flagged it as unjustified complexity for a single warehouse, and one extra tap per intake is a trivial cost compared to maintaining two BLE-related codepaths.

## Decisions locked in this brainstorm

- v1 is an **internal tool**, not SaaS-shaped. No `org_id`. No multi-tenant scaffolding.
- v1 uses **Server Actions** for the UI; the project-default API-first convention is explicitly deviated from for this release. HTTP API gets added in v2 if/when a real second consumer appears.
- v1 uses a **runtime-extensible category/attribute system** (deliberate complexity bet acknowledged in scope).
- v1 print path defaults to **render-and-share only**, pending JADENS protocol verification during planning.
- v1 cold-start is **lazy intake on next-touch**; no big-bang migration, no CSV import view.
- v1 auth allowlist lives in a **Vercel env var**, revoked by redeploy. Acceptable trade-off for a small static team. Move to a DB table if staff churn outpaces deploy frequency.
- v1 lifecycle is `stocked` → `sold`, with `archived` as a returns/write-off sink. The `listed` state is **dropped from v1**: listing happens outside the system in v1, there is no UI action that would set `listed`, and a state that nothing transitions into is dead surface. v2 sync will introduce `listed` when items move from "stocked in our system" to "listed on at least one platform." Confirm three-state model with Jaden during planning.
- v1 sold-platform field is the closed enum `Depop` / `Poshmark` / `eBay` / `Other`.

## Open questions for planning

Genuine decisions deferred to `/ce-plan`. They affect implementation but not the shape of v1.

1. **JADENS 268BT end-to-end render-and-share verification.** Since v1 commits to render-and-share regardless of the BLE outcome, the actual planning prerequisite is *not* reverse-engineering the GATT protocol — it is: "does the JADENS companion app reliably accept and print a label payload we generate (PNG and/or PDF) from a phone share sheet?" Confirm with Jaden's device + Jaden's phone, end-to-end. If that round-trip fails or is unreliable, the entire label-printing slice is at risk and the plan needs a backup path (offline 4×6 PDF print to AirPrint or a USB printer). **Blocker for the printing implementation unit.**
2. **Current intake baseline timing.** Time the existing intake process (with Jaden, on a typical garment, end-to-end including current photo + tagging + writing the number) and record the number. v1 success criterion 2 is anchored to this baseline, so the planning phase must produce it.
3. **Internal ID / SKU format.** Two concerns to settle: (a) what's printed as the human-readable string (sequential `000001`? prefix-per-category `CL-000001`?) and (b) what's encoded in the barcode (the same string, or an opaque ULID/UUID for security-against-enumeration). The two can diverge — human-readable for staff, opaque for the scan payload.
4. **Photo storage and upload model.** Vercel Blob with server-mediated presigned upload is the lowest-friction default. Confirm against Vercel's serverless body-size limits, plan for client-side resize before upload, and decide blob URL access (signed/expiring vs. public) given that photos may incidentally include shipping labels with PII.
5. **Auth specifics.** Email magic link via Auth.js with the staff allowlist read from a Vercel env var. Confirm allowlist format, magic-link TTL, and single-use semantics during planning.
6. **Status-transition validation.** With lifecycle locked to three states (`stocked`, `sold`, `archived`), the Service layer needs to enforce legal transitions (e.g. cannot mark-sold an `archived` item; cannot mark-stocked a `sold` item). Define the legal transitions explicitly in the plan, plus the special `intake_skipped` flag set by the quick-record-sale path.
7. **Scan-returns-no-record UX.** When staff scans a barcode that doesn't match any record (legacy hand-written numbers, items from before v1, mis-scans), what happens? Default proposed: route to a "Quick record sale" or "Start intake" disambiguation, with the scanned string pre-filled as the candidate ID. Confirm the disambiguation UX during planning. (This is the design-lens consensus gap from review.)
8. **Free-form field input limits and label-template sanitization.** Length caps and allowed character sets for free-form fields (location string, item title, attribute values rendered on labels). Tied to label rendering — the JADENS print width imposes a real cap. **Sanitize before rendering into HTML-based label templates** to prevent stored content injection in the label preview surface; this is independent of length caps.

9. **Server Action security baseline.** Confirm Next.js Server Action same-origin enforcement is active on the chosen Next.js version (13.4.4+); apply Auth.js session validation uniformly to every Server Action body, not just to page-level guards. v1 treats all allowlisted users as equivalent capability (intake, mark-sold, category-admin) — confirm with Jaden whether that's acceptable for v1.

10. **Magic-link security floor.** Magic links must be single-use and expire within 15 minutes (Auth.js default). Document explicitly: replayed and expired links are rejected with a new-link prompt. Session TTL: cap at 7 days, with the staff allowlist re-checked from the env var on every request via a JWT/session callback (so revocation-by-redeploy actually invalidates active sessions).

11. **Photo upload security.** Server-mediated presigned upload to Vercel Blob (client never holds the write token). Server-side EXIF stripping (GPS coordinates removed) before the blob URL is persisted — client-side resize is not a security control. Server-side MIME and magic-byte validation on the upload-completion callback. Signed/expiring blob URLs for retrieval; never public CDN URLs for inventory photos.

12. **Cold-start blind-spot for slow-moving stock.** Lazy intake works for items that turn over; long-tail inventory (clothing that sits, graded singles) may never be touched and therefore never enter the system. Plan should include either (a) a defined later trigger to sweep un-intaked stock (e.g. "after 90 days live, dedicate one day to backfilling untaken items") or (b) acknowledge that v1 is permanently a "system of record for items going forward" only, and adjust internal expectations accordingly.

## Risks

- **Pain #1 (cross-platform drift) is *not* addressed by v1.** This is acknowledged, not hidden. The mitigation while v2 sync is unbuilt: subscribe to a SaaS cross-listing tool (Vendoo / List Perfectly / Crosslist) as an interim solution. v1 is honest about its narrower scope — physical inventory and intake.
- **Runtime-extensible attribute system carries real complexity cost.** Schema, queries, forms, and label templates all become dependent on per-category definitions resolved at runtime. The bet — that category churn justifies the cost — must be tracked: if categories don't change in the first 6 months, this is too expensive for the value it returned. Fallback path: collapse to two concrete typed schemas (Clothing + Pokémon) is a contained migration.
- **Photos may incidentally contain PII.** Resellers photograph items with shipping labels and packing slips visible. Photo storage must use signed/expiring URLs, not public CDN URLs. Server-mediated upload, never client-side credentials. Confirm in planning.
- **Sequential SKU enables catalog enumeration.** A printed barcode encoding `000001` lets anyone with one label guess the rest. Decision (deferred to planning open question 3): use an opaque ULID in the barcode payload while keeping a human-readable sequential ID on the printed label and in the UI.
- **Allowlist via env var assumes low staff churn.** Acceptable for the current team. If staff turnover or contractor access becomes frequent, move the allowlist to a DB table with a small admin screen — that's a small migration, not a redesign.
- **Render-and-share round-trip unverified.** Until we confirm end-to-end that the JADENS companion app reliably accepts a label payload we generate (PNG/PDF) from a phone share sheet, the printing implementation unit is at risk. If the round-trip fails or is unreliable, the plan should adopt a backup path (offline 4×6 PDF print to any AirPrint or USB printer).
- **Lazy-intake cold-start means partial coverage for months.** Until existing inventory cycles through, the system answers "is item X in the system?" with "maybe." Acceptable, but staff need to know that the system is *not* a complete picture of total inventory at launch.

## Next steps

After this brainstorm:

1. Run `/ce-plan` against this requirements doc to produce an implementation plan.
2. **Planning prerequisites** — these must be done before or as the first steps of planning, because answers shape the plan:
   - Verify JADENS 268BT end-to-end render-and-share via the companion app on Jaden's actual phone with a label payload we generate.
   - Time the current baseline intake process with Jaden on a typical garment.
   - Confirm with Jaden that the three-state lifecycle (`stocked` → `sold` → `archived`) plus the `intake_skipped` flag is sufficient.
3. The plan should cover: Drizzle schema (item, category, attribute_definition, photo, location, sale), Server Action surface, intake flow (mobile + photo + label), printer integration path, auth (env-allowlist + magic link), and a deployable v1 milestone.
