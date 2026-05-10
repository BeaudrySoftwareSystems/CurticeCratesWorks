"use client";

import type { AttributeDefinition } from "@/domain/category";
import {
  ENUM_OPTION_MAX_LENGTH,
  TEXT_MAX_LENGTH,
} from "@/domain/category";

/**
 * Render dynamic per-category form fields. The schema is data, not code
 * (R7) — definitions come from `attribute_definitions` and the renderer
 * matches the dynamic Zod schema built server-side at submit. Field names
 * are namespaced with `attr.` so the Server Action can reconstruct the
 * raw map without colliding with core fields like `cost`.
 *
 * Validation errors come from the Server Action's response (form state)
 * keyed by `attr.<key>`.
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
      <p className="text-sm text-slate-500 dark:text-slate-400">
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
          <div key={def.id} className="grid gap-1">
            <label
              htmlFor={id}
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {humanize(def.key)}
              {def.required ? (
                <span aria-hidden className="ml-1 text-rose-600">
                  *
                </span>
              ) : null}
            </label>
            <FieldInput
              id={id}
              name={name}
              definition={def}
              defaultValue={defaultValue}
              error={error}
            />
            {error !== undefined ? (
              <p
                role="alert"
                className="text-sm text-rose-600 dark:text-rose-400"
              >
                {error}
              </p>
            ) : null}
          </div>
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
  error: string | undefined;
}

function FieldInput({
  id,
  name,
  definition,
  defaultValue,
  error,
}: FieldInputProps): React.ReactElement {
  const baseClass = `min-h-12 w-full rounded-md border px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 ${
    error !== undefined
      ? "border-rose-500 focus:ring-rose-500/40"
      : "border-slate-300 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900"
  }`;

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
          className={baseClass}
        />
      );
    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <input
            id={id}
            name={name}
            type="checkbox"
            value="true"
            defaultChecked={defaultValue === "true"}
            className="h-5 w-5 rounded border-slate-400"
          />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            Yes
          </span>
        </div>
      );
    case "enum": {
      const options = definition.enumOptions ?? [];
      return (
        <select
          id={id}
          name={name}
          defaultValue={defaultValue}
          required={definition.required}
          className={baseClass}
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
          className={baseClass}
        />
      );
  }
}

function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
