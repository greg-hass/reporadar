import { ChevronDownIcon } from "./icons";

interface Props {
  language: string;
  minStars: number;
  createdSinceDays: number;
  onChange: (patch: { language?: string; minStars?: number; createdSinceDays?: number }) => void;
}

export default function FilterRail({ language, minStars, createdSinceDays, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 md:flex md:flex-wrap md:items-end">
      <label>
        <span className="field-label">Language</span>
        <input
          value={language}
          onChange={(e) => onChange({ language: e.target.value })}
          placeholder="any"
          className="input w-full md:w-32"
        />
      </label>
      <label>
        <span className="field-label">Min stars</span>
        <input
          type="number"
          min={0}
          value={minStars}
          onChange={(e) => onChange({ minStars: Number(e.target.value) || 0 })}
          className="input w-full md:w-24"
        />
      </label>
      <label className="col-span-2 md:col-span-1">
        <span className="field-label">Created within</span>
        <span className="relative block">
          <select
            value={createdSinceDays}
            onChange={(e) => onChange({ createdSinceDays: Number(e.target.value) })}
            className="select w-full md:w-36"
          >
            <option value={0}>any time</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <ChevronDownIcon
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
          />
        </span>
      </label>
    </div>
  );
}
