/**
 * Skeleton primitive for loading.tsx files. Per PRODUCT.md the surface
 * uses no decorative motion — the skeleton's only signal is a quiet
 * pulse that respects `prefers-reduced-motion` (stripped via the
 * global rule in globals.css).
 *
 * Build the loading shell out of these by composing rectangles that
 * roughly match the page layout — the eye recognizes the structure
 * before the content arrives.
 */
export function Skeleton({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <span
      aria-hidden
      className={`block animate-pulse rounded bg-hairline ${className ?? ""}`}
    />
  );
}
