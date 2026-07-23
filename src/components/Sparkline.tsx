import { useId } from "react";

interface Props {
  points: number[];
  width?: number;
  height?: number;
}

export default function Sparkline({ points, width = 60, height = 26 }: Props) {
  const id = useId();
  const gradId = `spark-grad-${id}`;
  if (points.length === 0) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const barW = width / points.length;
  return (
    <svg width={width} height={height} className="overflow-visible">
      {points.map((p, i) => {
        const h = ((p - min) / range) * height;
        return (
          <rect
            key={i}
            x={i * barW}
            y={height - h}
            width={Math.max(barW - 1.5, 1)}
            height={Math.max(h, 1)}
            rx={1}
            fill={`url(#${gradId})`}
          />
        );
      })}
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-success)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
