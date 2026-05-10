import Link from "next/link";
import { Logo, WheatOrnament } from "@/components/ui/logo";

/**
 * The "we sent the link" confirmation. Mirrors the sign-in page's
 * editorial composition: Logo + ornament + serif italic line + body
 * + footer. Voice stays matter-of-fact per PRODUCT.md.
 */
export default function SignInSentPage(): React.ReactElement {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-12 px-6 py-12">
      <header className="grid place-items-center gap-8">
        <Logo size="lg" />
        <WheatOrnament className="h-3 w-32 text-driftwood/70" />
      </header>

      <section className="grid w-full gap-6 text-center">
        <div className="grid gap-1.5">
          <h1 className="font-serif text-[22px] italic font-semibold text-soot">
            Check your email
          </h1>
          <p className="font-sans text-[14px] leading-relaxed text-driftwood">
            We sent a one-tap sign-in link to your inbox.
            <br />
            It expires in 15 minutes and can only be used once.
          </p>
        </div>

        <Link
          href={{ pathname: "/sign-in" }}
          className="font-sans text-[14px] text-ember underline-offset-4 hover:underline"
        >
          Didn&apos;t get it? Send another →
        </Link>
      </section>

      <footer className="mt-auto pt-6 font-sans text-[12px] text-smoke">
        Curtice Crates · Staff sign-in
      </footer>
    </main>
  );
}
