import { useState } from "react";

interface Props {
  initial: string;
  onSearch: (q: string) => void;
}

export default function SearchBar({ initial, onSearch }: Props) {
  const [value, setValue] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim());
      }}
      className="flex gap-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search repos, e.g. macOS codex terminal…"
        className="flex-1 bg-bg border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:border-primary"
      />
      <button type="submit" className="bg-primary text-white font-semibold rounded-lg px-5 py-2.5 hover:opacity-90">
        Search
      </button>
    </form>
  );
}
