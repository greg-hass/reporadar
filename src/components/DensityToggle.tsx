import type { Density } from "../hooks/useDensity";

interface Props {
  value: Density;
  onChange: (d: Density) => void;
}

export default function DensityToggle({ value, onChange }: Props) {
  return (
    <div className="flex border border-border rounded-md overflow-hidden text-xs">
      {(["rich", "compact"] as Density[]).map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`px-2.5 py-1 ${value === d ? "bg-primary text-white" : "text-muted hover:text-text"}`}
        >
          {d === "rich" ? "Rich" : "Compact"}
        </button>
      ))}
    </div>
  );
}
