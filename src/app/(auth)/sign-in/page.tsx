import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Logo, WheatOrnament } from "@/components/ui/logo";

interface SignInPageProps {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

/**
 * Unauthenticated sign-in. The whole surface is composed as a single
 * editorial column (Logo, ornament, form, footer) rather than three
 * disconnected regions. Voice is matter-of-fact and structural per
 * PRODUCT.md — no "welcome back," no Display heading, no SaaS chrome.
 *
 * The wheat ornament from the Logo is reused as a faint driftwood
 * divider between the brand block and the form so the composition
 * reads as one page, not two stacked components.
 */
export default async function SignInPage({
  searchParams,
}: SignInPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const error = params.error;
  const callbackUrl = params.callbackUrl ?? "/";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-12 px-6 py-12">
      <header className="grid place-items-center gap-8">
        <Logo size="lg" />
        <WheatOrnament className="h-3 w-32 text-driftwood/70" />
      </header>

      <section className="grid w-full gap-6">
        <div className="grid gap-1.5 text-center">
          <h1 className="font-serif text-[22px] italic font-semibold text-soot">
            Sign in
          </h1>
          <p className="font-sans text-[13px] text-driftwood">
            Magic link, single use. Expires in 15 minutes.
          </p>
        </div>

        {error !== undefined ? (
          <p
            role="alert"
            className="rounded-md border border-signal/30 bg-signal/10 px-3 py-2 font-sans text-[13px] text-signal"
          >
            {error === "NotAllowed"
              ? "This email isn't on the staff allowlist. Ask the warehouse owner to add it."
              : "Sign-in failed. Try again, or contact the warehouse owner."}
          </p>
        ) : null}

        <form
          action={async (formData: FormData) => {
            "use server";
            const email = formData.get("email");
            if (typeof email !== "string" || email.trim() === "") {
              return;
            }
            await signIn("resend", {
              email: email.trim(),
              redirectTo: callbackUrl,
            });
          }}
          className="grid gap-4"
        >
          <Field htmlFor="email" label="Staff email">
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              autoFocus
            />
          </Field>
          <Button type="submit" variant="primary" className="w-full">
            Send sign-in link
          </Button>
        </form>
      </section>

      <footer className="mt-auto pt-6 font-sans text-[12px] text-smoke">
        Curtice Crates · Staff sign-in
      </footer>
    </main>
  );
}
