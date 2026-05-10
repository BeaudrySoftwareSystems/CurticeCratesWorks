"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  finalizeIntakeAction,
  type FinalizeIntakeFormState,
} from "@/app/actions/intake";
import type { AttributeDefinition } from "@/domain/category";
import { TEXT_MAX_LENGTH } from "@/domain/category";
import { AttributeFields } from "@/components/intake/AttributeFields";
import { PhotoCapture } from "@/components/intake/PhotoCapture";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Display, Label } from "@/components/ui/typography";

/**
 * Single-scroll mobile-first intake form (not a wizard). Sections, top
 * to bottom: photos → attributes → location → cost / list price. The
 * primary action sits in the thumb zone (lower 50% of viewport on
 * mobile), as a sticky solid Kraft bar — no glassmorphism.
 *
 * Photos are uploaded against `itemId` (a draft created server-side at
 * page mount) — by the time the action runs, photos are already linked.
 */
export interface IntakeFormProps {
  itemId: string;
  categoryId: string;
  categoryName: string;
  definitions: readonly AttributeDefinition[];
}

const INITIAL: FinalizeIntakeFormState = { status: "idle" };

export function IntakeForm({
  itemId,
  categoryId,
  categoryName,
  definitions,
}: IntakeFormProps): React.ReactElement {
  const [state, formAction] = useActionState(finalizeIntakeAction, INITIAL);
  const [uploading, setUploading] = useState(false);

  return (
    <form action={formAction} className="grid gap-8 pb-24">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="categoryId" value={categoryId} />

      <header className="grid gap-2">
        <Label>New {categoryName}</Label>
        <Display>Intake</Display>
      </header>

      {state.status === "error" && state.message !== undefined ? (
        <p
          role="alert"
          className="rounded-md border border-signal/30 bg-signal/10 px-3 py-2 font-sans text-[14px] text-signal"
        >
          {state.message}
        </p>
      ) : null}

      <Section
        eyebrow="Photos"
        hint="Tap to use the back camera. Upload runs in the background."
      >
        <PhotoCapture itemId={itemId} onUploadingChange={setUploading} />
      </Section>

      <Section eyebrow="Attributes">
        <AttributeFields
          definitions={definitions}
          fieldErrors={state.fieldErrors}
        />
      </Section>

      <Section eyebrow="Location">
        <Field
          htmlFor="location"
          label=""
          error={state.fieldErrors?.["location"]}
        >
          <Input
            id="location"
            name="location"
            type="text"
            maxLength={TEXT_MAX_LENGTH}
            placeholder="A1, top shelf"
          />
        </Field>
      </Section>

      <Section eyebrow="Pricing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            htmlFor="cost"
            label="Cost"
            required
            error={state.fieldErrors?.["cost"]}
          >
            <Input
              id="cost"
              name="cost"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              className="tabular"
            />
          </Field>
          <Field
            htmlFor="listPrice"
            label="List price"
            error={state.fieldErrors?.["listPrice"]}
          >
            <Input
              id="listPrice"
              name="listPrice"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="tabular"
            />
          </Field>
        </div>
      </Section>

      <StickyActions>
        <SubmitButton uploading={uploading} />
        {uploading ? (
          <span className="font-sans text-[12px] text-driftwood">
            Photos uploading…
          </span>
        ) : null}
      </StickyActions>
    </form>
  );
}

function Section({
  eyebrow,
  hint,
  children,
}: {
  eyebrow: string;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <Label>{eyebrow}</Label>
        {hint !== undefined ? (
          <span className="font-sans text-[11px] text-smoke">{hint}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StickyActions({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-kraft">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        {children}
      </div>
    </div>
  );
}

function SubmitButton({
  uploading,
}: {
  uploading: boolean;
}): React.ReactElement {
  const { pending } = useFormStatus();
  const disabled = pending || uploading;
  return (
    <Button
      type="submit"
      variant="primary"
      disabled={disabled}
      className="flex-1"
    >
      {pending ? "Saving…" : "Save & continue"}
    </Button>
  );
}
