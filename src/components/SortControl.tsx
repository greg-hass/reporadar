import type { SortKey } from "../lib/types";

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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortKey)}
      className="bg-bg border border-border rounded-md px-2 py-1.5 text-text text-sm"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
