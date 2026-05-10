"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { soldPlatformEnum } from "@/db/schema";
import {
  quickRecordSaleAction,
  type QuickRecordSaleFormState,
} from "@/app/actions/sale";
import { TEXT_MAX_LENGTH } from "@/domain/category";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Label } from "@/components/ui/typography";

const PLATFORMS = soldPlatformEnum.enumValues;
const INITIAL: QuickRecordSaleFormState = { status: "idle" };

/**
 * Quick-record-sale form (R11). Bypasses category-attribute validation —
 * `intake_skipped = true` on the items row is the data-level guard that
 * distinguishes these stub records from full-lifecycle items (rendered
 * as a Lantern Amber badge in CatalogList).
 */
export interface QuickSaleFormProps {
  categories: ReadonlyArray<{ id: string; name: string }>;
}

export function QuickSaleForm({
  categories,
}: QuickSaleFormProps): React.ReactElement {
  const [state, formAction] = useActionState(quickRecordSaleAction, INITIAL);

  return (
    <form action={formAction} className="grid gap-7 pb-24">
      {state.status === "error" && state.message !== undefined ? (
        <p
          role="alert"
          className="rounded-md border border-signal/30 bg-signal/10 px-3 py-2 font-sans text-[14px] text-signal"
        >
          {state.message}
        </p>
      ) : null}

      <Section eyebrow="Sale">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            htmlFor="soldPrice"
            label="Sold price"
            required
            error={state.fieldErrors?.["soldPrice"]}
          >
            <Input
              id="soldPrice"
              name="soldPrice"
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
            htmlFor="soldAt"
            label="Sold date"
            error={state.fieldErrors?.["soldAt"]}
          >
            <Input
              id="soldAt"
              name="soldAt"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="tabular"
            />
          </Field>
        </div>
      </Section>

      <Section eyebrow="Channel">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            htmlFor="platform"
            label="Platform"
            error={state.fieldErrors?.["platform"]}
          >
            <Select id="platform" name="platform" defaultValue="">
              <option value="">— Not yet known —</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field htmlFor="categoryId" label="Category">
            <Select id="categoryId" name="categoryId" defaultValue="">
              <option value="">— Uncategorized —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section eyebrow="Identifiers">
        <div className="grid gap-4">
          <Field
            htmlFor="title"
            label="Title"
            hint="Short identifier — recommended for catalog readability"
            error={state.fieldErrors?.["title"]}
          >
            <Input
              id="title"
              name="title"
              type="text"
              maxLength={TEXT_MAX_LENGTH}
              placeholder="e.g. vintage tee, Charizard PSA 9"
            />
          </Field>
          <Field
            htmlFor="buyerReference"
            label="Buyer reference"
            error={state.fieldErrors?.["buyerReference"]}
          >
            <Input
              id="buyerReference"
              name="buyerReference"
              type="text"
              maxLength={TEXT_MAX_LENGTH}
              placeholder="depop username, IG handle"
            />
          </Field>
        </div>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-kraft">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}

function Section({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="grid gap-3">
      <Label>{eyebrow}</Label>
      {children}
    </section>
  );
}

function SubmitButton(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      disabled={pending}
      className="flex-1"
    >
      {pending ? "Recording…" : "Record sale"}
    </Button>
  );
}
