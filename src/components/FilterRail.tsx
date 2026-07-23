interface Props {
  language: string;
  minStars: number;
  createdSinceDays: number;
  onChange: (patch: { language?: string; minStars?: number; createdSinceDays?: number }) => void;
}

export default function FilterRail({ language, minStars, createdSinceDays, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-center text-sm">
      <label className="text-muted">Language</label>
      <input
        value={language}
        onChange={(e) => onChange({ language: e.target.value })}
        placeholder="any"
        className="w-28 bg-bg border border-border rounded-md px-2 py-1 text-text text-sm"
      />
      <label className="text-muted ml-2">Min ★</label>
      <input
        type="number"
        min={0}
        value={minStars}
        onChange={(e) => onChange({ minStars: Number(e.target.value) || 0 })}
        className="w-20 bg-bg border border-border rounded-md px-2 py-1 text-text text-sm"
      />
      <label className="text-muted ml-2">Created within</label>
      <select
        value={createdSinceDays}
        onChange={(e) => onChange({ createdSinceDays: Number(e.target.value) })}
        className="bg-bg border border-border rounded-md px-2 py-1 text-text text-sm"
      >
        <option value={0}>any time</option>
        <option value={7}>7 days</option>
        <option value={30}>30 days</option>
        <option value={90}>90 days</option>
      </select>
    </div>
  );
}
