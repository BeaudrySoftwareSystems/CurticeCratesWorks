"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createCategoryAction,
  updateCategoryAction,
  type CategoryFormState,
} from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

const INITIAL: CategoryFormState = { status: "idle" };
const NAME_MAX = 80;
const DESC_MAX = 200;

/**
 * Reusable category form for both /admin/categories/new and the
 * details panel on /admin/categories/[id]. The mode controls which
 * Server Action drives the submit and what the success copy says.
 */
export interface CategoryFormProps {
  mode: "create" | "update";
  categoryId?: string;
  defaults?: {
    name: string;
    description: string | null;
    sortOrder: number;
  };
}

export function CategoryForm({
  mode,
  categoryId,
  defaults,
}: CategoryFormProps): React.ReactElement {
  // useActionState requires a stable action ref. Bind the categoryId at
  // mount-time so the same updateCategoryAction signature works.
  const action =
    mode === "update" && categoryId !== undefined
      ? updateCategoryAction.bind(null, categoryId)
      : createCategoryAction;
  const [state, formAction] = useActionState(action, INITIAL);

  return (
    <form action={formAction} className="grid gap-5">
      {state.status === "error" && state.message !== undefined ? (
        <p
          role="alert"
          className="rounded-md border border-signal/30 bg-signal/10 px-3 py-2 font-sans text-[13px] text-signal"
        >
          {state.message}
        </p>
      ) : state.status === "idle" && state.message !== undefined ? (
        <p
          role="status"
          className="rounded-md border border-edge bg-paper px-3 py-2 font-sans text-[13px] text-driftwood"
        >
          {state.message}
        </p>
      ) : null}

      <Field
        htmlFor="name"
        label="Name"
        required
        hint={`Up to ${NAME_MAX} characters. Shown in the catalog filters and intake picker.`}
        error={state.fieldErrors?.["name"]}
      >
        <Input
          id="name"
          name="name"
          type="text"
          maxLength={NAME_MAX}
          required
          defaultValue={defaults?.name ?? ""}
          placeholder="e.g. Funko Pops"
        />
      </Field>

      <Field
        htmlFor="description"
        label="Description"
        hint="Optional context for the team."
        error={state.fieldErrors?.["description"]}
      >
        <Input
          id="description"
          name="description"
          type="text"
          maxLength={DESC_MAX}
          defaultValue={defaults?.description ?? ""}
          placeholder="What kinds of items belong here?"
        />
      </Field>

      <Field
        htmlFor="sortOrder"
        label="Sort order"
        hint="Lower numbers appear first in pickers. Defaults to 0."
        error={state.fieldErrors?.["sortOrder"]}
      >
        <Input
          id="sortOrder"
          name="sortOrder"
          type="number"
          inputMode="numeric"
          step="1"
          defaultValue={defaults?.sortOrder !== undefined ? String(defaults.sortOrder) : ""}
          placeholder="0"
          className="tabular max-w-[8rem]"
        />
      </Field>

      <div className="flex items-center gap-2 pt-1">
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}

function SubmitButton({
  mode,
}: {
  mode: "create" | "update";
}): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending
        ? mode === "create"
          ? "Creating…"
          : "Saving…"
        : mode === "create"
          ? "Create category"
          : "Save changes"}
    </Button>
  );
}
