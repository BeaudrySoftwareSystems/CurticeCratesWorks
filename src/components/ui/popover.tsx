"use client";

import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * Headless popover primitive. Owns:
 *   - Open/closed state (uncontrolled by default; controllable via
 *     `open` + `onOpenChange` if a caller wants to drive it)
 *   - Click-outside dismissal
 *   - Escape-key dismissal
 *   - aria-expanded / aria-controls wiring on the trigger
 *
 * Layout / styling: the caller renders the trigger and the panel —
 * the popover just positions the panel absolutely below the trigger,
 * right-aligned. Two surfaces in the app use this today: the user
 * chip in the header and the catalog filter chips.
 */
export interface PopoverProps {
  /**
   * Trigger element. Receives `aria-expanded`, `aria-controls`,
   * `aria-haspopup`, and an `onClick` that toggles the popover.
   */
  trigger: (args: {
    open: boolean;
    toggle: () => void;
    triggerProps: {
      "aria-expanded": boolean;
      "aria-controls": string;
      "aria-haspopup": "menu" | "listbox" | "dialog" | true;
    };
  }) => ReactElement;
  /** Panel content. Rendered inside an absolutely-positioned wrapper. */
  children: ReactNode;
  /** ARIA role for the panel. Defaults to "menu". */
  role?: "menu" | "listbox" | "dialog";
  /** Right-align (default) or left-align the panel under the trigger. */
  align?: "start" | "end";
  /** Tailwind classes applied to the panel surface. */
  panelClassName?: string;
  /** Controlled mode: callers can lift the open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Close the popover after any click inside the panel. Useful for menus. */
  closeOnSelect?: boolean;
}

const DEFAULT_PANEL =
  "absolute z-30 mt-1.5 min-w-[180px] overflow-hidden rounded-md border border-hairline bg-kraft shadow-[0_4px_16px_oklch(22%_0.008_60_/_0.10),0_12px_32px_oklch(22%_0.008_60_/_0.08)]";

export function Popover({
  trigger,
  children,
  role = "menu",
  align = "end",
  panelClassName,
  open: controlledOpen,
  onOpenChange,
  closeOnSelect = false,
}: PopoverProps): React.ReactElement {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean): void => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  const containerRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (
        containerRef.current !== null &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // setOpen is stable enough for our two consumers; lifting it would just
    // add a ref-stash without changing behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const triggerEl = trigger({
    open,
    toggle: () => setOpen(!open),
    triggerProps: {
      "aria-expanded": open,
      "aria-controls": panelId,
      "aria-haspopup": role === "dialog" ? "dialog" : role,
    },
  });

  const triggerWithClick = cloneElement(triggerEl, {
    onClick: (e: React.MouseEvent) => {
      const existing = (
        triggerEl.props as { onClick?: (e: React.MouseEvent) => void }
      ).onClick;
      existing?.(e);
      if (!e.defaultPrevented) {
        setOpen(!open);
      }
    },
  } as Partial<React.HTMLAttributes<HTMLElement>>);

  return (
    <span ref={containerRef} className="relative inline-block">
      {triggerWithClick}
      {open ? (
        <div
          id={panelId}
          role={role}
          className={`${DEFAULT_PANEL} ${align === "end" ? "right-0" : "left-0"} ${panelClassName ?? ""}`}
          onClick={() => {
            if (closeOnSelect) setOpen(false);
          }}
        >
          {children}
        </div>
      ) : null}
    </span>
  );
}
