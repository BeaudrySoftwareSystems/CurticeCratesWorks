"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import {
  ErrConflict,
  ErrInUse,
  ErrNotFound,
  ErrUnauthenticated,
  ErrValidation,
} from "@/domain/errors";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { AttributeDefinitionRepository } from "@/repositories/attribute_definition.repository";
import { CategoryRepository } from "@/repositories/category.repository";
import { ItemRepository } from "@/repositories/item.repository";
import {
  CategoryService,
  type AttributeDefinitionInput,
  type CategoryInput,
} from "@/services/category.service";

/**
 * Admin actions for the categories + attribute_definitions surface
 * (`/admin/categories`). Every action is the same thin pass-through
 * shape used elsewhere in the app:
 *
 *   1. requireSession  →  2. parse FormData  →  3. service call  →
 *   4. revalidate the surfaces that depend on the changed data  →
 *   5. redirect (mutations) or return form state (validation errors)
 *
 * Mutating the catalog of categories ripples to multiple surfaces:
 *   - `/admin/categories` (the admin list itself)
 *   - `/intake` (category picker)
 *   - `/` (catalog filter dropdown)
 *
 * Each action revalidates all three so the next render sees the change.
 */

const VALID_TYPES = ["text", "number", "decimal", "boolean", "enum"] as const;

export interface CategoryFormState {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

const idle: CategoryFormState = { status: "idle" };

function buildCategoryService(): CategoryService {
  const db = getDb();
  return new CategoryService(
    new CategoryRepository(db),
    new AttributeDefinitionRepository(db),
    new ItemRepository(db),
  );
}

async function requireSession(): Promise<void> {
  const session = await auth();
  const email = session?.user?.email;
  if (email === undefined || email === null || email === "") {
    throw new ErrUnauthenticated();
  }
}

function revalidateCategorySurfaces(): void {
  revalidatePath("/admin/categories");
  revalidatePath("/intake");
  revalidatePath("/(warehouse)");
}

// --- Categories -------------------------------------------------------------

function parseCategoryInput(formData: FormData): CategoryInput | string {
  const name = formData.get("name");
  const description = formData.get("description");
  const sortOrderRaw = formData.get("sortOrder");

  if (typeof name !== "string" || name.trim() === "") {
    return "name: required";
  }
  const result: CategoryInput = { name: name.trim() };
  if (typeof description === "string" && description.trim() !== "") {
    result.description = description.trim();
  } else {
    result.description = null;
  }
  if (typeof sortOrderRaw === "string" && sortOrderRaw.trim() !== "") {
    const n = Number(sortOrderRaw);
    if (!Number.isInteger(n)) {
      return "sortOrder: must be an integer";
    }
    result.sortOrder = n;
  }
  return result;
}

export async function createCategoryAction(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  let redirectTarget: string | null = null;
  try {
    await requireSession();
    const parsed = parseCategoryInput(formData);
    if (typeof parsed === "string") {
      return errorFor(parsed);
    }
    const svc = buildCategoryService();
    const cat = await svc.createCategory(parsed);
    revalidateCategorySurfaces();
    redirectTarget = `/admin/categories/${cat.id}`;
  } catch (err) {
    return mapErrorToFormState(err);
  }
  if (redirectTarget !== null) {
    // SAFETY: id validated server-side; typed-routes can't narrow.
    redirect(redirectTarget as Parameters<typeof redirect>[0]);
  }
  return idle;
}

export async function updateCategoryAction(
  categoryId: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  try {
    await requireSession();
    const parsed = parseCategoryInput(formData);
    if (typeof parsed === "string") {
      return errorFor(parsed);
    }
    const svc = buildCategoryService();
    await svc.updateCategory(categoryId, parsed);
    revalidateCategorySurfaces();
    revalidatePath(`/admin/categories/${categoryId}`);
  } catch (err) {
    return mapErrorToFormState(err);
  }
  return { status: "idle", message: "Saved" };
}

export async function deleteCategoryAction(
  categoryId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await requireSession();
    await buildCategoryService().deleteCategory(categoryId);
    revalidateCategorySurfaces();
  } catch (err) {
    if (err instanceof ErrInUse) {
      return {
        ok: false,
        message: `${err.referencedBy} item(s) still use this category. Archive or reassign them first.`,
      };
    }
    if (err instanceof ErrNotFound) {
      return { ok: false, message: err.message };
    }
    if (err instanceof ErrUnauthenticated) {
      return { ok: false, message: "Sign in required." };
    }
    logger.error({ err }, "deleteCategoryAction failed");
    return { ok: false, message: "Could not delete category." };
  }
  // SAFETY: literal route; typed-routes plugin is finicky in actions.
  redirect("/admin/categories" as Parameters<typeof redirect>[0]);
}

// --- Attribute definitions --------------------------------------------------

function parseAttributeInput(
  formData: FormData,
): AttributeDefinitionInput | string {
  const key = formData.get("key");
  const type = formData.get("type");
  const required = formData.get("required");
  const sortOrderRaw = formData.get("sortOrder");
  const enumOptionsRaw = formData.get("enumOptions");

  if (typeof key !== "string" || key.trim() === "") {
    return "key: required";
  }
  if (typeof type !== "string" || type === "") {
    return "type: required";
  }
  if (!(VALID_TYPES as readonly string[]).includes(type)) {
    return `type: invalid (${type})`;
  }
  const result: AttributeDefinitionInput = {
    key: key.trim(),
    type: type as AttributeDefinitionInput["type"],
  };
  if (required === "on" || required === "true") {
    result.required = true;
  }
  if (typeof sortOrderRaw === "string" && sortOrderRaw.trim() !== "") {
    const n = Number(sortOrderRaw);
    if (!Number.isInteger(n)) {
      return "sortOrder: must be an integer";
    }
    result.sortOrder = n;
  }
  if (type === "enum") {
    if (typeof enumOptionsRaw !== "string" || enumOptionsRaw.trim() === "") {
      return "enumOptions: required for enum type";
    }
    result.enumOptions = enumOptionsRaw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s !== "");
  }
  return result;
}

export async function createAttributeDefinitionAction(
  categoryId: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  try {
    await requireSession();
    const parsed = parseAttributeInput(formData);
    if (typeof parsed === "string") {
      return errorFor(parsed);
    }
    const svc = buildCategoryService();
    await svc.addAttributeDefinition(categoryId, parsed);
    revalidateCategorySurfaces();
    revalidatePath(`/admin/categories/${categoryId}`);
  } catch (err) {
    return mapErrorToFormState(err);
  }
  return { status: "idle", message: "Attribute added" };
}

export async function updateAttributeDefinitionAction(
  attributeId: string,
  categoryId: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  try {
    await requireSession();
    const parsed = parseAttributeInput(formData);
    if (typeof parsed === "string") {
      return errorFor(parsed);
    }
    const svc = buildCategoryService();
    await svc.updateAttributeDefinition(attributeId, parsed);
    revalidateCategorySurfaces();
    revalidatePath(`/admin/categories/${categoryId}`);
  } catch (err) {
    return mapErrorToFormState(err);
  }
  return { status: "idle", message: "Saved" };
}

export async function deleteAttributeDefinitionAction(
  attributeId: string,
  categoryId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await requireSession();
    await buildCategoryService().deleteAttributeDefinition(attributeId);
    revalidateCategorySurfaces();
    revalidatePath(`/admin/categories/${categoryId}`);
  } catch (err) {
    if (err instanceof ErrNotFound) {
      return { ok: false, message: err.message };
    }
    if (err instanceof ErrUnauthenticated) {
      return { ok: false, message: "Sign in required." };
    }
    logger.error({ err }, "deleteAttributeDefinitionAction failed");
    return { ok: false, message: "Could not delete attribute." };
  }
  return { ok: true };
}

// --- Helpers ---------------------------------------------------------------

function errorFor(issue: string): CategoryFormState {
  const colon = issue.indexOf(":");
  if (colon === -1) {
    return { status: "error", message: issue };
  }
  const field = issue.slice(0, colon).trim();
  const message = issue.slice(colon + 1).trim();
  return { status: "error", fieldErrors: { [field]: message } };
}

function mapErrorToFormState(err: unknown): CategoryFormState {
  if (err instanceof ErrValidation) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const colon = issue.indexOf(":");
      if (colon === -1) {
        fieldErrors["_"] = issue;
      } else {
        const field = issue.slice(0, colon).trim();
        fieldErrors[field] = issue.slice(colon + 1).trim();
      }
    }
    return { status: "error", fieldErrors, message: "Some fields need attention." };
  }
  if (err instanceof ErrConflict) {
    return {
      status: "error",
      fieldErrors: { [err.field]: err.message },
      message: err.message,
    };
  }
  if (err instanceof ErrInUse) {
    return {
      status: "error",
      message: `${err.referencedBy} item(s) still reference this. Archive or reassign first.`,
    };
  }
  if (err instanceof ErrNotFound) {
    return { status: "error", message: err.message };
  }
  if (err instanceof ErrUnauthenticated) {
    return { status: "error", message: "Sign in required." };
  }
  logger.error({ err }, "category admin action failed");
  return { status: "error", message: "Something went wrong." };
}
