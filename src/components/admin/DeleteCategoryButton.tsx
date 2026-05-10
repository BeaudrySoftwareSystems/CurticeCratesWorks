"use client";

import { useState, useTransition } from "react";
import { deleteCategoryAction } from "@/app/actions/categories";
import { Button } from "@/components/ui/button";

/**
 * Single-tap delete that shows the consequence inline (per the v1 voice
 * rule: trust the user, don't gate every action with a confirm dialog).
 * Inline message replaces the modal that would otherwise live here.
 */
export function DeleteCategoryButton({
  categoryId,
  itemCount,
}: {
  categoryId: string;
  itemCount: number;
}): React.ReactElement {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (itemCount > 0) {
    return (
      <p className="font-sans text-[12px] text-driftwood">
        Cannot delete: {itemCount} item(s) still reference this category.
        Archive or reassign them first.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {error !== null ? (
        <p
          role="alert"
          className="font-sans text-[12px] text-signal"
        >
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="destructive"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await deleteCategoryAction(categoryId);
            if (!result.ok) {
              setError(result.message);
            }
          })
        }
      >
        {pending ? "Deleting…" : "Delete category"}
      </Button>
    </div>
  );
}
