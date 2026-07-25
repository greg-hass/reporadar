import { useEffect, useState } from "react";

interface Handlers {
  /** Enter — open in-app detail */
  onOpen: (i: number) => void;
  /** "o" — open on GitHub in a new tab */
  onExternal?: (i: number) => void;
}

/**
 * j/k/Enter keyboard navigation over a list of `count` items.
 * Returns the selected index (-1 = none) and a reset for when the list changes.
 * Ignores keystrokes while typing in form fields.
 */
export function useRovingKeys(count: number, handlers: Handlers, active = true) {
  const [sel, setSel] = useState(-1);
  const { onOpen, onExternal } = handlers;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!active || count === 0) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "j") setSel((s) => Math.min(s + 1, count - 1));
      else if (e.key === "k") setSel((s) => Math.max(s - 1, 0));
      else if (e.key === "Enter" && sel >= 0 && sel < count) onOpen(sel);
      else if ((e.key === "o" || e.key === "O") && sel >= 0 && sel < count) onExternal?.(sel);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [count, sel, active, onOpen, onExternal]);

  return { sel, reset: () => setSel(-1) };
}
