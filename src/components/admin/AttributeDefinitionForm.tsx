"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createAttributeDefinitionAction,
  updateAttributeDefinitionAction,
  type CategoryFormState,
} from "@/app/actions/categories";
import type { AttributeDefinition, AttributeType } from "@/domain/category";
import { Button } from "@/components/ui/button";
import { Field, INPUT_CLS, Input, Select } from "@/components/ui/field";

const INITIAL: CategoryFormState = { status: "idle" };

const TYPE_OPTIONS: ReadonlyArray<{ value: AttributeType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number (whole)" },
  { value: "decimal", label: "Decimal" },
  { value: "boolean", label: "Yes / No" },
  { value: "enum", label: "Pick from list" },
];

/**
 * Form for adding or updating one attribute definition. Type changes
 * reveal/hide the enum-options textarea inline so the form's vocabulary
 * stays consistent regardless of mode.
 */
export interface AttributeDefinitionFormProps {
  categoryId: string;
  mode: "create" | "update";
  /** Required in update mode. */
  attributeId?: string;
  defaults?: Partial<AttributeDefinition>;
  onComplete?: () => void;
}

export function AttributeDefinitionForm({
  categoryId,
  mode,
  attributeId,
  defaults,
}: AttributeDefinitionFormProps): React.ReactElement {
  const action =
    mode === "update" && attributeId !== undefined
      ? updateAttributeDefinitionAction.bind(null, attributeId, categoryId)
      : createAttributeDefinitionAction.bind(null, categoryId);
  const [state, formAction] = useActionState(action, INITIAL);
  const [type, setType] = useState<AttributeType>(
    defaults?.type ?? "text",
  );

  return (
    <form action={formAction} className="grid gap-4">
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          htmlFor="key"
          label="Key"
          required
          hint="Lowercase, digits, underscores. Stored on items.attributes."
          error={state.fieldErrors?.["key"]}
        >
          <Input
            id="key"
            name="key"
            type="text"
            required
            pattern="^[a-z][a-z0-9_]*$"
            defaultValue={defaults?.key ?? ""}
            placeholder="brand_name"
            className="tabular"
          />
        </Field>
        <Field
          htmlFor="type"
          label="Type"
          required
          error={state.fieldErrors?.["type"]}
        >
          <Select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as AttributeType)}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {type === "enum" ? (
        <Field
          htmlFor="enumOptions"
          label="Options"
          required
          hint="One per line. Each ≤ 50 chars (label-printer limit)."
          error={state.fieldErrors?.["enumOptions"]}
        >
          <textarea
            id="enumOptions"
            name="enumOptions"
            rows={5}
            defaultValue={(defaults?.enumOptions ?? []).join("\n")}
            placeholder={"NM\nLP\nMP\nHP"}
            className={`${INPUT_CLS} h-auto py-2 leading-snug`}
          />
        </Field>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          htmlFor="sortOrder"
          label="Sort order"
          hint="Lower numbers appear first in the intake form."
          error={state.fieldErrors?.["sortOrder"]}
        >
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            inputMode="numeric"
            step="1"
            defaultValue={
              defaults?.sortOrder !== undefined ? String(defaults.sortOrder) : ""
            }
            placeholder="0"
            className="tabular max-w-[8rem]"
          />
        </Field>
        <div className="grid items-end gap-1.5">
          <label
            htmlFor="required"
            className="inline-flex items-center gap-2 font-sans text-[14px] text-soot"
          >
            <input
              id="required"
              name="required"
              type="checkbox"
              defaultChecked={defaults?.required ?? false}
              className="h-5 w-5 rounded border-edge text-ember focus:ring-ember/30"
            />
            <span>Required at intake</span>
          </label>
        </div>
      </div>

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
        ? "Saving…"
        : mode === "create"
          ? "Add attribute"
          : "Save attribute"}
    </Button>
  );
}
