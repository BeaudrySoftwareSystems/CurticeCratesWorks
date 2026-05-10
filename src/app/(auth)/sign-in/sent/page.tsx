import Link from "next/link";
import { Caption, Display, Label } from "@/components/ui/typography";
import { Wordmark } from "@/components/ui/wordmark";

export default function SignInSentPage(): React.ReactElement {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md grid-rows-[auto_1fr_auto] gap-10 px-5 py-8">
      <div>
        <Wordmark size="lg" />
      </div>

      <div className="grid gap-7 self-center">
        <header className="grid gap-2">
          <Label>Sign in</Label>
          <Display>Check your email</Display>
          <Caption>
            A magic link is on its way. Tap it to sign in. Expires in 15
            minutes and is single-use.
          </Caption>
        </header>

        <Link
          href={{ pathname: "/sign-in" }}
          className="font-sans text-[14px] text-ember underline-offset-4 hover:underline"
        >
          Didn&apos;t receive it? Request another →
        </Link>
      </div>

      <Caption className="text-[12px] text-smoke">
        Curtis Crates internal · Single-tenant · Staff only.
      </Caption>
    </main>
  );
}
