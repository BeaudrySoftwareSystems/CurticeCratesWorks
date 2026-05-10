/**
 * OpenTelemetry instrumentation hook. v1 ships without OTel — this file is a
 * placeholder that Phase 2+ wires up when external traffic and LLM calls
 * arrive. Keeping the file ensures Next.js's instrumentation hook is
 * registered and ready to use without a config change later.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export function register(): void {
  // Intentionally empty in v1. Add OTel SDK init here when extending.
}
