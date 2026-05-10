"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import {
  ErrInvalidTransition,
  ErrNotFound,
  ErrUnauthenticated,
} from "@/domain/errors";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { ItemRepository } from "@/repositories/item.repository";
import { SaleRepository } from "@/repositories/sale.repository";
import { ItemService } from "@/services/item.service";

export interface ArchiveFormState {
  status: "idle" | "error";
  message?: string;
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
 * Archive a stocked or sold item. Sale rows are preserved (R12 + R10) —
 * archive is a soft removal from the active catalog, not a delete. The
 * Service layer owns the transition matrix; this action is a thin
 * pass-through that maps domain errors onto form state.
 */
export async function archiveItemAction(
  _prev: ArchiveFormState,
  formData: FormData,
): Promise<ArchiveFormState> {
  let redirectTarget: string | null = null;
  try {
    await requireSession();
    const itemId = formData.get("itemId");
    if (typeof itemId !== "string" || itemId === "") {
      return {
        status: "error",
        message: "Missing item id — refresh and try again.",
      };
    }
    const items = buildItemService();
    await items.archive(itemId);
    revalidatePath("/(warehouse)");
    redirectTarget = `/items/${itemId}`;
  } catch (err) {
    if (err instanceof ErrInvalidTransition) {
      return {
        status: "error",
        message: "This item is already archived.",
      };
    }
    if (err instanceof ErrNotFound) {
      return { status: "error", message: err.message };
    }
    if (err instanceof ErrUnauthenticated) {
      return { status: "error", message: "Sign in required." };
    }
    logger.error({ err }, "unexpected error in archiveItemAction");
    return { status: "error", message: "Something went wrong." };
  }
  if (redirectTarget !== null) {
    // SAFETY: itemId validated above.
    redirect(redirectTarget as Parameters<typeof redirect>[0]);
  }
  return { status: "idle" };
}
