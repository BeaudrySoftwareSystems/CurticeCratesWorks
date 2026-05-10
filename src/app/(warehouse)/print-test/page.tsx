import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PrintTestRunner } from "@/components/print-test/PrintTestRunner";

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
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
      <header className="grid gap-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Planning prerequisite · Unit 0.1
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          JADENS print-path verification
        </h1>
        <p className="text-sm text-slate-500">
          Tap <strong>Generate test label</strong>, then exercise each of
          the three paths below. For each path, attempt 5 prints and
          record:
        </p>
        <ul className="ml-5 list-disc text-sm text-slate-500">
          <li>Did JADENS appear / accept the file?</li>
          <li>Time from tap to print.</li>
          <li>Did the printed barcode scan back to the label&apos;s ULID?</li>
        </ul>
        <p className="text-sm text-slate-500">
          The path with 5/5 success and 10/10 scan-back becomes the
          primary in Unit 11.
        </p>
      </header>
      <PrintTestRunner />
    </main>
  );
}
