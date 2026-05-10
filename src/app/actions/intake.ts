"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import {
  ErrInvalidTransition,
  ErrNotFound,
  ErrUnauthenticated,
  ErrValidation,
} from "@/domain/errors";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { AttributeDefinitionRepository } from "@/repositories/attribute_definition.repository";
import { CategoryRepository } from "@/repositories/category.repository";
import { ItemRepository } from "@/repositories/item.repository";
import { SaleRepository } from "@/repositories/sale.repository";
import { CategoryService } from "@/services/category.service";
import { ItemService } from "@/services/item.service";

/**
 * Composition root for the intake actions. The Service layer is the
 * stable seam (CLAUDE.md, plan B5); the action body stays a thin
 * pass-through. Built per request to keep test setups symmetric with
 * the service-level fakes — mirroring the Drizzle adapter's per-request
 * `getDb()` pattern.
 */
function buildServices(): {
  categories: CategoryService;
  items: ItemService;
} {
  const db = getDb();
  return {
    categories: new CategoryService(
      new CategoryRepository(db),
      new AttributeDefinitionRepository(db),
    ),
    items: new ItemService(
      db,
      new ItemRepository(db),
      new SaleRepository(db),
      logger,
    ),
  };
}

async function requireSession(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (email === undefined || email === null || email === "") {
    throw new ErrUnauthenticated();
  }
  return email;
}

/**
 * Action invoked at intake-page mount: creates a draft `stocked` item
 * with empty attributes so photos can attach to a real item id during
 * upload. The form's submit later finalizes this item with the validated
 * attributes + cost + optional list price + optional location.
 *
 * Abandoned drafts are an accepted v1 trade-off (small warehouse, two
 * staff). Cleanup is a manual archive or a future cron pass — not v1.
 */
export async function startDraftIntake(categoryId: string): Promise<{
  itemId: string;
}> {
  await requireSession();
  const { items } = buildServices();
  // The categoryId FK constraint will reject unknown ids at insert time —
  // surfacing as a 500 to the caller. The intake page only links to
  // categories returned by the picker query, so this should not happen
  // outside of bookmarked stale URLs.
  const item = await items.createItem({ categoryId });
  return { itemId: item.id };
}

export interface FinalizeIntakeFormState {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

const TEXT_MAX = 200;

/**
 * The single Server Action that turns a draft into a fully-described item.
 * Action body is a thin pass-through (B5):
 *   1. auth → 2. parse FormData → 3. categoryService.validateIntake →
 *   4. itemService.finalizeIntake → 5. revalidate → 6. redirect to detail
 *
 * The hosted form passes itemId + categoryId as hidden fields. Attribute
 * keys are encoded as `attr.<key>` so the parser can reconstruct the raw
 * map without colliding with the core fields.
 */
export async function finalizeIntakeAction(
  _prev: FinalizeIntakeFormState,
  formData: FormData,
): Promise<FinalizeIntakeFormState> {
  let redirectTarget: string | null = null;
  try {
    await requireSession();
    const itemId = formData.get("itemId");
    const categoryId = formData.get("categoryId");
    const cost = formData.get("cost");
    const listPriceRaw = formData.get("listPrice");
    const locationRaw = formData.get("location");

    if (typeof itemId !== "string" || itemId === "") {
      return {
        status: "error",
        message: "missing itemId — refresh and try again",
      };
    }
    if (typeof categoryId !== "string" || categoryId === "") {
      return {
        status: "error",
        message: "missing categoryId — refresh and try again",
      };
    }
    if (typeof cost !== "string" || cost === "") {
      return {
        status: "error",
        fieldErrors: { cost: "Cost is required" },
      };
    }
    if (!/^\d+(\.\d{1,2})?$/.test(cost)) {
      return {
        status: "error",
        fieldErrors: { cost: "Cost must be a number with up to 2 decimals" },
      };
    }
    const listPrice =
      typeof listPriceRaw === "string" && listPriceRaw !== ""
        ? listPriceRaw
        : undefined;
    if (
      listPrice !== undefined &&
      !/^\d+(\.\d{1,2})?$/.test(listPrice)
    ) {
      return {
        status: "error",
        fieldErrors: {
          listPrice: "List price must be a number with up to 2 decimals",
        },
      };
    }
    const location =
      typeof locationRaw === "string" && locationRaw !== ""
        ? locationRaw
        : undefined;
    if (location !== undefined && location.length > TEXT_MAX) {
      return {
        status: "error",
        fieldErrors: {
          location: `Location must be ${TEXT_MAX} characters or fewer`,
        },
      };
    }

    const rawAttributes: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("attr.")) continue;
      const k = key.slice("attr.".length);
      if (typeof value !== "string") continue;
      // Normalize blanks → undefined so optional attrs don't surface as ""
      // in the validated payload (which would defeat zod's `.optional()`).
      if (value === "") continue;
      // Booleans come through as 'on'/'off'/'true'/'false'; numbers as strings.
      // Let zod coerce — we forward the raw shape and rely on the schema
      // builder to type-narrow. (Builder runs server-side, post-parse.)
      rawAttributes[k] = value;
    }

    const { categories, items } = buildServices();
    // Re-coerce numbers + booleans by building a tiny type map from defs.
    // We need this because FormData entries are always strings.
    const coerced = await coerceAttributeStrings(
      categoryId,
      rawAttributes,
      categories,
    );
    const validated = await categories.validateIntake(categoryId, coerced);
    const item = await items.finalizeIntake(itemId, {
      attributes: validated.attributes,
      cost,
      ...(listPrice !== undefined ? { listPrice } : {}),
      ...(location !== undefined ? { location } : {}),
    });

    revalidatePath("/(warehouse)");
    redirectTarget = `/items/${item.id}`;
  } catch (err) {
    if (err instanceof ErrValidation) {
      return {
        status: "error",
        fieldErrors: zodIssuesToFieldErrors(err.issues),
        message: "Some fields need attention.",
      };
    }
    if (err instanceof ErrNotFound) {
      return {
        status: "error",
        message: err.message,
      };
    }
    if (err instanceof ErrInvalidTransition) {
      return {
        status: "error",
        message: "This item can no longer be edited.",
      };
    }
    if (err instanceof ErrUnauthenticated) {
      return { status: "error", message: "Sign in required." };
    }
    logger.error({ err }, "unexpected error in finalizeIntakeAction");
    return { status: "error", message: "Something went wrong." };
  }
  // Redirect outside the try/catch — Next throws an internal redirect signal
  // that the catch above must not swallow.
  if (redirectTarget !== null) {
    // SAFETY: dynamic item id is validated to be a non-empty string above;
    // Next's typed-routes plugin can't statically verify dynamic segments.
    redirect(redirectTarget as Parameters<typeof redirect>[0]);
  }
  return { status: "idle" };
}

/**
 * Coerce FormData strings (always typeof === "string") into the shapes the
 * dynamic Zod schema expects: "12" → 12 for number/decimal types, "on" /
 * "true" → true for booleans. Text and enum pass through. Definitions
 * come from the service; the coerced map is then validated by
 * `validateIntake` (still the single trust boundary).
 */
async function coerceAttributeStrings(
  categoryId: string,
  raw: Record<string, unknown>,
  categories: CategoryService,
): Promise<Record<string, unknown>> {
  const defs = await categories.getDefinitions(categoryId);
  const out: Record<string, unknown> = {};
  for (const def of defs) {
    const v = raw[def.key];
    if (v === undefined) continue;
    if (def.type === "number" || def.type === "decimal") {
      const n = typeof v === "string" ? Number(v) : v;
      out[def.key] = typeof n === "number" && !Number.isNaN(n) ? n : v;
    } else if (def.type === "boolean") {
      out[def.key] =
        typeof v === "string" ? v === "true" || v === "on" : Boolean(v);
    } else {
      out[def.key] = v;
    }
  }
  return out;
}

function zodIssuesToFieldErrors(
  issues: readonly string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const colon = issue.indexOf(":");
    if (colon === -1) {
      out["_"] = issue;
      continue;
    }
    const path = issue.slice(0, colon).trim();
    const msg = issue.slice(colon + 1).trim();
    out[path === "(root)" ? "_" : `attr.${path}`] = msg;
  }
  return out;
}
