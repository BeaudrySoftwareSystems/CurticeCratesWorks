/**
 * Item domain types.
 *
 * `Item` and `NewItem` come from the Drizzle schema's inferred shapes; we
 * re-export them here so service / handler code never reaches into
 * `@/db/schema` directly. Status transitions and the closed list of valid
 * statuses live here as the single source of truth, queried by the service
 * layer when validating moves.
 */
import type { Item as DbItem, NewItem as DbNewItem } from "@/db/schema";

export type Item = DbItem;
export type NewItem = DbNewItem;

export const ITEM_STATUSES = ["stocked", "sold", "archived"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/**
 * v1 status transition matrix. `stocked → sold`, `stocked → archived`,
 * `sold → archived`. Anything else is an invalid transition.
 *
 * Service-layer transition checks pivot off this map; do not encode the rules
 * inline at call sites.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<ItemStatus, readonly ItemStatus[]>> = {
  stocked: ["sold", "archived"],
  sold: ["archived"],
  archived: [],
};

export function isAllowedTransition(
  from: ItemStatus,
  to: ItemStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
