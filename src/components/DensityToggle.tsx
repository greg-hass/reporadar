import type { Density } from "../hooks/useDensity";

interface Props {
  value: Density;
  onChange: (d: Density) => void;
}

export default function DensityToggle({ value, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Card density"
      className="flex w-full min-w-0 rounded-lg border border-border bg-bg p-0.5 text-xs sm:w-auto"
    >
      {(["rich", "compact"] as Density[]).map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          aria-pressed={value === d}
          className={`min-w-0 flex-1 px-3 py-1.5 min-h-[32px] rounded-md capitalize transition-colors sm:flex-none ${
            value === d ? "bg-primary text-white font-semibold" : "text-muted hover:text-text"
          }`}
        >
          {d}
        </button>
      ))}
    </div>
  );
}
