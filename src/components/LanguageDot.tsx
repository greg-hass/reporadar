export default function LanguageDot({ language }: { language: string | null }) {
  // minimal stable hash → hue so each language gets a consistent color
  let hash = 0;
  if (language) for (const c of language) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const hue = language ? hash % 360 : 0;
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-1.5 shrink-0"
      style={{ backgroundColor: language ? `hsl(${hue} 60% 60%)` : "var(--color-muted)" }}
    />
  );
}
