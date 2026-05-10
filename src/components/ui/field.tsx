import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import { Label } from "./typography";

/**
 * Form-control vocabulary. One <Field> wrapper renders the Label, the
 * input, and an inline error region — every form in the app uses the
 * same shape so spacing and focus behavior stay identical screen-to-
 * screen (the product register's "consistency over surprise" rule).
 *
 * The actual <input>/<select>/<textarea> primitive is plain HTML — only
 * the className is normalized via INPUT_CLS.
 */

export const INPUT_CLS =
  "min-h-12 w-full rounded-md border border-edge bg-paper px-3 py-2 text-[15px] leading-snug text-soot placeholder:text-smoke shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.4)] transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30 disabled:cursor-not-allowed disabled:bg-kraft";

export interface FieldProps {
  htmlFor: string;
  label: ReactNode;
  required?: boolean;
  error?: string | undefined;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Field({
  htmlFor,
  label,
  required,
  error,
  hint,
  children,
  className,
}: FieldProps): React.ReactElement {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label as="label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span aria-hidden className="ml-1 text-signal">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {hint !== undefined && error === undefined ? (
        <p className="font-sans text-[12px] text-driftwood">{hint}</p>
      ) : null}
      {error !== undefined ? (
        <p
          role="alert"
          className="font-sans text-[12px] text-signal"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...rest }: InputProps): React.ReactElement {
  return <input {...rest} className={`${INPUT_CLS} ${className ?? ""}`} />;
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({
  className,
  children,
  ...rest
}: SelectProps): React.ReactElement {
  return (
    <select {...rest} className={`${INPUT_CLS} pr-10 ${className ?? ""}`}>
      {children}
    </select>
  );
}
