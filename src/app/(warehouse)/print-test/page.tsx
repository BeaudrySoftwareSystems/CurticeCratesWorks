import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PrintTestRunner } from "@/components/print-test/PrintTestRunner";
import { PageHeader } from "@/components/ui/page-header";
import { Display, Label } from "@/components/ui/typography";

export const dynamic = "force-dynamic";

/**
 * JADENS 268BT print-path verification scaffolding (plan Unit 0.1).
 *
 * Generates a 4×6 test label and exposes the three candidate print
 * paths so we can rank them on Jaden's actual phone before committing
 * to one in Unit 11. Not linked from the main UI — navigate directly
 * to /print-test.
 */
export default async function PrintTestPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (session?.user?.email === undefined || session.user.email === null) {
    redirect("/sign-in");
  }
  return (
    <>
      <PageHeader email={session.user.email ?? undefined} />
      <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
        <header className="grid gap-3">
          <Label>Planning prerequisite · Unit 0.1</Label>
          <Display>JADENS print verification</Display>
          <p className="font-sans text-[14px] leading-relaxed text-driftwood">
            Generate a test label, then exercise each of the three paths
            below. Per path: 5 print attempts, record JADENS acceptance,
            time-to-print, and 10/10 barcode scan-back. The path that
            wins becomes Unit 11&apos;s primary.
          </p>
        </header>
        <PrintTestRunner />
      </main>
    </>
  );
}
