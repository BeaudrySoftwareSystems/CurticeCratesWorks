# Curtis Crates Inventory Management

Internal inventory + intake system of record for Curtis Crates. Phone-first warehouse app for cataloging items, printing labels, and recording sales.

This is **v1**: physical-inventory and intake only. Cross-platform sync (Depop / Poshmark / eBay listing creation and delisting-on-sale) is v2.

## Documents

- **Requirements:** `docs/brainstorms/2026-05-09-inventory-management-system-requirements.md`
- **Implementation plan:** `docs/plans/2026-05-09-001-feat-inventory-mgmt-v1-plan.md`

Read the plan first — it has the full architectural decisions, scope boundaries, and unit-by-unit work breakdown.

## Stack

| Area | Choice |
|------|--------|
| Runtime / package manager | Bun |
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript strict (`noUncheckedIndexedAccess`, no `any`) |
| Database | PostgreSQL (Neon) via `drizzle-orm/neon-serverless` |
| ORM | Drizzle |
| Auth | Auth.js v5 magic link + env-var allowlist |
| Storage | Vercel Blob (added in Phase 2) |
| Tests | Vitest + Testing Library |
| Logging | Pino structured JSON |

## Local development

### Prerequisites

- Bun ≥ 1.1
- A Neon Postgres project (free tier is fine)
- A Resend account (for magic-link email — only needed when working on auth flows)

### Setup

```bash
# 1. Install dependencies
bun install

# 2. Copy env template and fill in values
cp .env.example .env.local
# Required for any local work:
#   DATABASE_URL  - from your Neon project
#   AUTH_SECRET   - generate with: openssl rand -base64 32
#   STAFF_ALLOWLIST - your email + any teammates

# 3. Apply migrations to your Neon dev branch
bun run db:migrate

# 4. Seed the v1 categories
bun run db:seed

# 5. Start the dev server
bun run dev
```

### Day-to-day

```bash
bun run dev          # dev server at http://localhost:3000
bun run lint         # ESLint
bun run typecheck    # TypeScript
bun run test         # Vitest (run once)
bun run test:watch   # Vitest (watch mode)
bun run db:studio    # Drizzle Studio (visual DB browser)
bun run db:generate  # Generate a new migration after schema changes
```

## Architecture (per the plan)

```
app/(routes) → Server Actions → Service → Repository / Gateway → I/O
              (or Server Components → Service for read paths)
```

Strict layering:

| Layer | Owns | Imports allowed | Imports forbidden |
|-------|------|-----------------|-------------------|
| `app/` (Server Actions / Route Handlers / Pages) | HTTP / form parsing, auth, response shaping | Service interfaces | Repository, Gateway, DB client |
| `services/` | Business logic, orchestration, transactions | Repo / Gateway interfaces, Domain | Framework types, DB / HTTP clients |
| `repositories/` | Internal persistence (our DB) | Drizzle, Domain | Business logic, external APIs |
| `gateways/` | External systems (Vercel Blob, future LLM) | HTTP / vendor SDKs, Domain | Business logic, DB client |
| `domain/` | Types, value objects, sentinel errors | Standard library only | Everything else |

The single Route Handler exception is `app/api/blob/upload/route.ts` — required by `@vercel/blob`'s `handleUpload` model. Everything else is a Server Action.

## Phase 1 status

Phase 1 = Units 1–3 (scaffolding + auth + schema). When complete, the app boots, magic-link sign-in works for emails on `STAFF_ALLOWLIST`, and the schema is migrated with the three v1 categories seeded. Phase 2 starts the Service / Repository / photo work.

See the plan's "Phased Delivery" section for what each phase ships.
