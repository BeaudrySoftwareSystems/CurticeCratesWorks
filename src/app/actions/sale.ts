"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { soldPlatformEnum } from "@/db/schema";
import {
  ErrAlreadySold,
  ErrInvalidTransition,
  ErrNotFound,
  ErrUnauthenticated,
  ErrValidation,
} from "@/domain/errors";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { ItemRepository } from "@/repositories/item.repository";
import { SaleRepository } from "@/repositories/sale.repository";
import { ItemService } from "@/services/item.service";

const ALLOWED_PLATFORMS = soldPlatformEnum.enumValues;
type SoldPlatform = (typeof ALLOWED_PLATFORMS)[number];

const TEXT_MAX = 200;

export interface MarkSoldFormState {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

function buildItemService(): ItemService {
  const db = getDb();
  return new ItemService(
    db,
    new ItemRepository(db),
    new SaleRepository(db),
    logger,
  );
}

async function requireSession(): Promise<void> {
  const session = await auth();
  const email = session?.user?.email;
  if (email === undefined || email === null || email === "") {
    throw new ErrUnauthenticated();
  }
}

/**
 * Mark a stocked item sold. Thin pass-through:
 *   1. auth → 2. parse FormData → 3. itemService.markSold (which owns the
 *   transaction + transition guard) → 4. revalidate → 5. redirect to
 *   the same item detail so the new status badge renders.
 *
 * Platform left unselected persists as NULL — the brainstorm decision
 * (R10) explicitly distinguishes "Other" (platform we don't enumerate)
 * from null (don't know yet).
 */
export async function markSoldAction(
  _prev: MarkSoldFormState,
  formData: FormData,
): Promise<MarkSoldFormState> {
  let redirectTarget: string | null = null;
  try {
    await requireSession();
    const itemId = formData.get("itemId");
    const soldPriceRaw = formData.get("soldPrice");
    const platformRaw = formData.get("platform");
    const buyerReferenceRaw = formData.get("buyerReference");
    const soldAtRaw = formData.get("soldAt");

    if (typeof itemId !== "string" || itemId === "") {
      return {
        status: "error",
        message: "Missing item id — refresh and try again.",
      };
    }
    if (typeof soldPriceRaw !== "string" || soldPriceRaw === "") {
      return {
        status: "error",
        fieldErrors: { soldPrice: "Sold price is required" },
      };
    }
    if (!/^\d+(\.\d{1,2})?$/.test(soldPriceRaw)) {
      return {
        status: "error",
        fieldErrors: {
          soldPrice: "Sold price must be a number with up to 2 decimals",
        },
      };
    }
    let platform: SoldPlatform | undefined;
    if (typeof platformRaw === "string" && platformRaw !== "") {
      if (!(ALLOWED_PLATFORMS as readonly string[]).includes(platformRaw)) {
        return {
          status: "error",
          fieldErrors: {
            platform: `Platform must be one of: ${ALLOWED_PLATFORMS.join(", ")}`,
          },
        };
      }
      platform = platformRaw as SoldPlatform;
    }
    let buyerReference: string | undefined;
    if (typeof buyerReferenceRaw === "string" && buyerReferenceRaw !== "") {
      if (buyerReferenceRaw.length > TEXT_MAX) {
        return {
          status: "error",
          fieldErrors: {
            buyerReference: `Buyer reference must be ${TEXT_MAX} characters or fewer`,
          },
        };
      }
      buyerReference = buyerReferenceRaw;
    }
    let soldAt: Date | undefined;
    if (typeof soldAtRaw === "string" && soldAtRaw !== "") {
      const parsed = new Date(soldAtRaw);
      if (Number.isNaN(parsed.getTime())) {
        return {
          status: "error",
          fieldErrors: { soldAt: "Sold date is not a valid date" },
        };
      }
      soldAt = parsed;
    }

    const items = buildItemService();
    await items.markSold(itemId, {
      soldPrice: soldPriceRaw,
      ...(platform !== undefined ? { platform } : {}),
      ...(buyerReference !== undefined ? { buyerReference } : {}),
      ...(soldAt !== undefined ? { soldAt } : {}),
    });
    revalidatePath("/(warehouse)");
    redirectTarget = `/items/${itemId}`;
  } catch (err) {
    if (err instanceof ErrValidation) {
      return {
        status: "error",
        message: "Some fields need attention.",
        fieldErrors: {},
      };
    }
    if (err instanceof ErrAlreadySold) {
      return {
        status: "error",
        message: "This item is already marked sold.",
      };
    }
    if (err instanceof ErrInvalidTransition) {
      return {
        status: "error",
        message: "This item can no longer be marked sold.",
      };
    }
    if (err instanceof ErrNotFound) {
      return { status: "error", message: err.message };
    }
    if (err instanceof ErrUnauthenticated) {
      return { status: "error", message: "Sign in required." };
    }
    logger.error({ err }, "unexpected error in markSoldAction");
    return { status: "error", message: "Something went wrong." };
  }
  if (redirectTarget !== null) {
    // SAFETY: dynamic item id is validated to be a non-empty string above;
    // Next's typed-routes plugin can't statically verify dynamic segments.
    redirect(redirectTarget as Parameters<typeof redirect>[0]);
  }
  return { status: "idle" };
}
