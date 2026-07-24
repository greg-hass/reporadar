interface Props<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}

/** Touch-friendly segmented pill control (replaces native selects for small option sets). */
export default function SegmentedControl<T extends string>({ value, options, onChange, ariaLabel }: Props<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex rounded-lg border border-border bg-bg p-0.5 text-xs"
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`px-3 py-1.5 min-h-[32px] rounded-md whitespace-nowrap transition-colors ${
            value === o.value ? "bg-primary text-white font-semibold" : "text-muted hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
