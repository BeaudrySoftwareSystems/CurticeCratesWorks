"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAttributeDefinitionAction } from "@/app/actions/categories";
import type { AttributeDefinition } from "@/domain/category";
import { Button } from "@/components/ui/button";
import { Label, Tabular } from "@/components/ui/typography";
import { AttributeDefinitionForm } from "@/components/admin/AttributeDefinitionForm";

/**
 * Read + edit + delete list for the attributes on one category. Edit is
 * an inline form expansion; delete is a single tap with the consequence
 * shown next to the row (no confirmation modal — the v1 voice rule says
 * trust the user and surface the result, not gate every action).
 */
export interface AttributesListProps {
  categoryId: string;
  definitions: readonly AttributeDefinition[];
}

export function AttributesList({
  categoryId,
  definitions,
}: AttributesListProps): React.ReactElement {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = (id: string): void => {
    setError(null);
    startTransition(async () => {
      const result = await deleteAttributeDefinitionAction(id, categoryId);
      if (!result.ok) {
        setError(result.message);
      } else {
        router.refresh();
      }
    });
  };

  if (definitions.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-edge bg-paper px-3 py-4 text-center font-sans text-[13px] text-driftwood">
        No attributes defined yet. Add one below.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {error !== null ? (
        <p
          role="alert"
          className="rounded-md border border-signal/30 bg-signal/10 px-3 py-2 font-sans text-[13px] text-signal"
        >
          {error}
        </p>
      ) : null}
      <ul className="grid gap-2">
        {definitions.map((def) => {
          const expanded = editingId === def.id;
          return (
            <li
              key={def.id}
              className="grid gap-3 rounded-lg border border-hairline bg-paper p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="grid gap-0.5">
                  <span className="tabular text-[13px] text-soot">
                    {def.key}
                  </span>
                  <span className="font-sans text-[11px] uppercase tracking-[0.08em] text-driftwood">
                    {def.type}
                    {def.required ? " · required" : null}
                    {def.type === "enum" && def.enumOptions !== null ? (
                      <>
                        {" · "}
                        <Tabular>{def.enumOptions.length}</Tabular> options
                      </>
                    ) : null}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setEditingId((cur) => (cur === def.id ? null : def.id))
                    }
                    className="min-h-10 px-3 text-[13px]"
                  >
                    {expanded ? "Close" : "Edit"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => handleDelete(def.id)}
                    className="min-h-10 px-3 text-[13px]"
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {def.type === "enum" && def.enumOptions !== null ? (
                <div>
                  <Label>Options</Label>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {def.enumOptions.map((opt) => (
                      <li
                        key={opt}
                        className="rounded-md border border-hairline bg-bone px-2 py-0.5 font-mono text-[12px] text-soot"
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {expanded ? (
                <div className="border-t border-hairline pt-3">
                  <AttributeDefinitionForm
                    categoryId={categoryId}
                    mode="update"
                    attributeId={def.id}
                    defaults={def}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
