import { signIn } from "@/lib/auth";

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
    <main>
      <h1>Sign in</h1>
      <p>
        We&apos;ll email you a magic link. Only staff on the allowlist can sign in.
      </p>

      {error !== undefined && (
        <p style={{ color: "red" }} role="alert">
          {error === "NotAllowed"
            ? "This email is not authorized. Contact the warehouse owner if you should have access."
            : "Sign-in failed. Try again, or contact the warehouse owner."}
        </p>
      )}

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
      >
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
        />
        <button type="submit">Send magic link</button>
      </form>
    </main>
  );
}
