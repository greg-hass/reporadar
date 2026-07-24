import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "./icons";

interface Props {
  initial: string;
  onSearch: (q: string) => void;
}

export default function SearchBar({ initial, onSearch }: Props) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses the search box from anywhere (GitHub-style).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim());
      }}
      className="flex gap-2"
    >
      <div className="relative flex-1">
        <SearchIcon
          size={17}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search repos, e.g. macOS codex terminal…"
          enterKeyHint="search"
          className="input w-full !rounded-xl !bg-surface pl-10 pr-10 !py-3 text-[15px] shadow-card"
        />
        <kbd className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 items-center justify-center w-5 h-5 rounded border border-border text-[11px] text-muted pointer-events-none">
          /
        </kbd>
      </div>
      <button type="submit" className="btn-primary px-5 text-sm shrink-0">
        Search
      </button>
    </form>
  );
}
