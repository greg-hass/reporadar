import { useId } from "react";

interface Props {
  points: number[];
  width?: number;
  height?: number;
  /** draw an accent dot at the latest point */
  endDot?: boolean;
}

/** Area + line sparkline over recent star snapshots. */
export default function Sparkline({ points, width = 72, height = 28, endDot = false }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `spark-area-${id}`;
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const coords = points.map((p, i): [number, number] => [
    i * stepX,
    height - 2 - ((p - min) / range) * (height - 4),
  ]);
  const line = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {endDot && (
        <circle
          cx={coords[coords.length - 1][0]}
          cy={coords[coords.length - 1][1]}
          r="2.4"
          fill="var(--color-accent)"
          style={{ filter: "drop-shadow(0 0 3px var(--color-accent))" }}
        />
      )}
    </svg>
  );
}
