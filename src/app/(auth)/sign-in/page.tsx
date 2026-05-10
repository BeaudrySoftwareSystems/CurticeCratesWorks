import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Caption, Display, Label } from "@/components/ui/typography";
import { Wordmark } from "@/components/ui/wordmark";

interface SignInPageProps {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

export default async function SignInPage({
  searchParams,
}: SignInPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const error = params.error;
  const callbackUrl = params.callbackUrl ?? "/";

  return (
    <main className="mx-auto grid min-h-dvh max-w-md grid-rows-[auto_1fr_auto] gap-10 px-5 py-8">
      <div>
        <Wordmark size="lg" />
      </div>

      <div className="grid gap-7 self-center">
        <header className="grid gap-2">
          <Label>Sign in</Label>
          <Display>Magic link only</Display>
          <Caption>
            Enter your staff email and we&apos;ll send a one-tap sign-in link.
            The link expires in 15 minutes.
          </Caption>
        </header>

        {error !== undefined ? (
          <p
            role="alert"
            className="rounded-md border border-signal/30 bg-signal/10 px-3 py-2 font-sans text-[14px] text-signal"
          >
            {error === "NotAllowed"
              ? "This email is not on the staff allowlist. Ask the warehouse owner to add it."
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
          className="grid gap-5"
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
            />
          </Field>
          <Button type="submit" variant="primary" className="w-full">
            Send magic link
          </Button>
        </form>
      </div>

      <Caption className="text-[12px] text-smoke">
        Curtis Crates internal · Single-tenant · Staff only.
      </Caption>
    </main>
  );
}
