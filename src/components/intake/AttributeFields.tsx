"use client";

import type { AttributeDefinition } from "@/domain/category";
import {
  ENUM_OPTION_MAX_LENGTH,
  TEXT_MAX_LENGTH,
} from "@/domain/category";
import { Field, INPUT_CLS } from "@/components/ui/field";

/**
 * Render dynamic per-category form fields. The schema is data, not code
 * (R7) — definitions come from `attribute_definitions` and the renderer
 * matches the dynamic Zod schema built server-side at submit. Field
 * names are namespaced with `attr.` so the action can reconstruct the
 * raw map without colliding with core fields.
 */
export interface AttributeFieldsProps {
  definitions: readonly AttributeDefinition[];
  fieldErrors?: Record<string, string>;
  /**
   * Default values from a previous submit attempt. Used to keep the form
   * sticky on validation errors.
   */
  defaults?: Record<string, string>;
}

export function AttributeFields({
  definitions,
  fieldErrors = {},
  defaults = {},
}: AttributeFieldsProps): React.ReactElement {
  if (definitions.length === 0) {
    return (
      <p className="font-sans text-[13px] text-driftwood">
        No additional attributes for this category.
      </p>
    );
  }
  return (
    <div className="grid gap-4">
      {definitions.map((def) => {
        const id = `attr-${def.key}`;
        const name = `attr.${def.key}`;
        const error = fieldErrors[name];
        const defaultValue = defaults[def.key] ?? "";
        return (
          <Field
            key={def.id}
            htmlFor={id}
            label={humanize(def.key)}
            required={def.required}
            error={error}
          >
            <FieldInput
              id={id}
              name={name}
              definition={def}
              defaultValue={defaultValue}
            />
          </Field>
        );
      })}
    </div>
  );
}

interface FieldInputProps {
  id: string;
  name: string;
  definition: AttributeDefinition;
  defaultValue: string;
}

function FieldInput({
  id,
  name,
  definition,
  defaultValue,
}: FieldInputProps): React.ReactElement {
  switch (definition.type) {
    case "number":
    case "decimal":
      return (
        <input
          id={id}
          name={name}
          type="number"
          inputMode={definition.type === "decimal" ? "decimal" : "numeric"}
          step={definition.type === "decimal" ? "0.01" : "1"}
          required={definition.required}
          defaultValue={defaultValue}
          className={`${INPUT_CLS} tabular`}
        />
      );
    case "boolean":
      return (
        <label className="inline-flex min-h-12 items-center gap-3 font-sans text-[14px] text-soot">
          <input
            id={id}
            name={name}
            type="checkbox"
            value="true"
            defaultChecked={defaultValue === "true"}
            className="h-5 w-5 rounded border-edge text-ember focus:ring-ember/30"
          />
          <span className="text-driftwood">Yes</span>
        </label>
      );
    case "enum": {
      const options = definition.enumOptions ?? [];
      return (
        <select
          id={id}
          name={name}
          defaultValue={defaultValue}
          required={definition.required}
          className={INPUT_CLS}
        >
          <option value="">Select…</option>
          {options.map((opt) => (
            <option
              key={opt}
              value={opt.slice(0, ENUM_OPTION_MAX_LENGTH)}
            >
              {opt}
            </option>
          ))}
        </select>
      );
    }
    case "text":
    default:
      return (
        <input
          id={id}
          name={name}
          type="text"
          maxLength={TEXT_MAX_LENGTH}
          required={definition.required}
          defaultValue={defaultValue}
          className={INPUT_CLS}
        />
      );
  }
}

function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
