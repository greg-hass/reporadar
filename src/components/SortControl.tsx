import type { SortKey } from "../lib/types";
import { ChevronDownIcon } from "./icons";

interface Props {
  value: SortKey;
  onChange: (s: SortKey) => void;
}

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "best-match", label: "Best match" },
  { value: "stars", label: "Most stars" },
  { value: "updated", label: "Recently updated" },
];

export default function SortControl({ value, onChange }: Props) {
  return (
    <span className="relative inline-block min-w-0 max-w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        aria-label="Sort results"
        className="select min-w-0 max-w-full !py-1.5 text-[13px]"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDownIcon
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
      />
    </span>
  );
}
