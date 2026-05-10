"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { soldPlatformEnum } from "@/db/schema";
import {
  markSoldAction,
  type MarkSoldFormState,
} from "@/app/actions/sale";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Title } from "@/components/ui/typography";

const PLATFORMS = soldPlatformEnum.enumValues;
const INITIAL: MarkSoldFormState = { status: "idle" };

/**
 * Native <dialog>-backed Mark Sold modal. The interior sits on Kraft
 * with the Overlay Lift shadow and a warm Soot/40 backdrop — neither
 * the SaaS-default cool grey nor a glassmorphic blur.
 */
export interface MarkSoldDialogProps {
  itemId: string;
  defaultListPrice?: string | null;
}

export function MarkSoldDialog({
  itemId,
  defaultListPrice,
}: MarkSoldDialogProps): React.ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(markSoldAction, INITIAL);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = dialogRef.current;
    if (d === null) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)} className="flex-1">
        Mark sold
      </Button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-hairline bg-kraft p-0 text-soot shadow-[0_4px_16px_oklch(22%_0.008_60_/_0.10),0_12px_32px_oklch(22%_0.008_60_/_0.08)] backdrop:bg-soot/40"
        onClose={() => setOpen(false)}
      >
        <form action={formAction} className="grid gap-5 p-5">
          <input type="hidden" name="itemId" value={itemId} />
          <header className="grid gap-1">
            <Title>Mark sold</Title>
            <p className="font-sans text-[13px] text-driftwood">
              Capture the sale details. Platform is optional, leave blank
              if you don&apos;t know yet.
            </p>
          </header>

          {state.status === "error" && state.message !== undefined ? (
            <p
              role="alert"
              className="rounded-md border border-signal/30 bg-signal/10 px-3 py-2 font-sans text-[13px] text-signal"
            >
              {state.message}
            </p>
          ) : null}

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
              defaultValue={defaultListPrice ?? ""}
              className="tabular"
            />
          </Field>

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

          <Field
            htmlFor="buyerReference"
            label="Buyer reference"
            hint="depop username, IG handle, or any short identifier"
            error={state.fieldErrors?.["buyerReference"]}
          >
            <Input
              id="buyerReference"
              name="buyerReference"
              type="text"
              maxLength={200}
            />
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <SubmitButton />
          </div>
        </form>
      </dialog>
    </>
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
      {pending ? "Saving…" : "Confirm sale"}
    </Button>
  );
}
