import type { Logger } from "pino";
import type { Db } from "@/db/client";
import type {
  Item,
  NewItem,
  NewSale,
  Sale,
  soldPlatformEnum,
} from "@/db/schema";
import {
  ErrAlreadySold,
  ErrInvalidTransition,
  ErrNotFound,
} from "@/domain/errors";
import { isAllowedTransition, type ItemStatus } from "@/domain/item";

type SoldPlatform = (typeof soldPlatformEnum.enumValues)[number];

/**
 * Repository capabilities the service depends on. Defined here per the
 * project's "interfaces at the consumer" rule (CLAUDE.md, ISP) — the
 * concrete `ItemRepository` / `SaleRepository` classes structurally satisfy
 * these without an explicit `implements`.
 */
export interface ItemReader {
  findById(id: string, tx?: Db): Promise<Item | null>;
}
export interface ItemWriter {
  create(input: NewItem, tx?: Db): Promise<Item>;
  setStatus(id: string, status: ItemStatus, tx?: Db): Promise<Item | null>;
}
export interface SaleWriter {
  create(input: NewSale, tx?: Db): Promise<Sale>;
}

export interface CreateItemInput {
  categoryId: string;
  attributes?: Record<string, unknown>;
  cost?: string;
  listPrice?: string;
  location?: string;
}

export interface SaleInput {
  soldPrice: string;
  platform?: SoldPlatform;
  buyerReference?: string;
  soldAt?: Date;
}

export interface QuickSaleInput {
  categoryId: string;
  soldPrice: string;
  platform?: SoldPlatform;
  buyerReference?: string;
  soldAt?: Date;
}

/**
 * Owns the v1 item lifecycle: intake (`createItem`), mark-sold
 * (`markSold`), archive (`archive`), and the bypass-intake quick sale path
 * (`quickRecordSale`). The status transition matrix lives in
 * `domain/item.ts` and is consulted before every mutating call.
 *
 * `markSold` and `quickRecordSale` open a `db.transaction()` so the paired
 * writes (item status + sale row, or item insert + sale insert) cannot
 * partially commit.
 */
export class ItemService {
  constructor(
    private readonly db: Db,
    private readonly items: ItemReader & ItemWriter,
    private readonly sales: SaleWriter,
    private readonly logger: Logger,
  ) {}

  async createItem(input: CreateItemInput): Promise<Item> {
    const item = await this.items.create({
      categoryId: input.categoryId,
      attributes: input.attributes ?? {},
      ...(input.cost !== undefined ? { cost: input.cost } : {}),
      ...(input.listPrice !== undefined ? { listPrice: input.listPrice } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
    });
    this.logger.info(
      {
        event: "item.created",
        itemId: item.id,
        displayId: item.displayId,
        categoryId: item.categoryId,
      },
      "item created",
    );
    return item;
  }

  async markSold(id: string, sale: SaleInput): Promise<Item> {
    return this.db.transaction(async (tx) => {
      const item = await this.items.findById(id, tx as Db);
      if (item === null) {
        throw new ErrNotFound("item", id);
      }
      if (item.status === "sold") {
        throw new ErrAlreadySold(id);
      }
      if (!isAllowedTransition(item.status as ItemStatus, "sold")) {
        throw new ErrInvalidTransition(id, item.status, "sold");
      }

      await this.sales.create(
        {
          itemId: id,
          soldPrice: sale.soldPrice,
          ...(sale.platform !== undefined ? { platform: sale.platform } : {}),
          ...(sale.buyerReference !== undefined
            ? { buyerReference: sale.buyerReference }
            : {}),
          ...(sale.soldAt !== undefined ? { soldAt: sale.soldAt } : {}),
        },
        tx as Db,
      );

      const updated = await this.items.setStatus(id, "sold", tx as Db);
      if (updated === null) {
        throw new ErrNotFound("item", id);
      }

      this.logger.info(
        {
          event: "item.sold",
          itemId: id,
          soldPrice: sale.soldPrice,
          platform: sale.platform,
        },
        "item sold",
      );
      return updated;
    });
  }

  async archive(id: string): Promise<Item> {
    const item = await this.items.findById(id);
    if (item === null) {
      throw new ErrNotFound("item", id);
    }
    if (!isAllowedTransition(item.status as ItemStatus, "archived")) {
      throw new ErrInvalidTransition(id, item.status, "archived");
    }
    const updated = await this.items.setStatus(id, "archived");
    if (updated === null) {
      throw new ErrNotFound("item", id);
    }
    this.logger.info(
      { event: "item.archived", itemId: id, from: item.status },
      "item archived",
    );
    return updated;
  }

  async quickRecordSale(
    input: QuickSaleInput,
  ): Promise<{ item: Item; sale: Sale }> {
    return this.db.transaction(async (tx) => {
      const item = await this.items.create(
        {
          categoryId: input.categoryId,
          attributes: {},
          intakeSkipped: true,
          status: "sold",
        },
        tx as Db,
      );
      const sale = await this.sales.create(
        {
          itemId: item.id,
          soldPrice: input.soldPrice,
          ...(input.platform !== undefined
            ? { platform: input.platform }
            : {}),
          ...(input.buyerReference !== undefined
            ? { buyerReference: input.buyerReference }
            : {}),
          ...(input.soldAt !== undefined ? { soldAt: input.soldAt } : {}),
        },
        tx as Db,
      );
      this.logger.info(
        {
          event: "item.quickSaleRecorded",
          itemId: item.id,
          displayId: item.displayId,
          soldPrice: input.soldPrice,
        },
        "quick sale recorded",
      );
      return { item, sale };
    });
  }
}
