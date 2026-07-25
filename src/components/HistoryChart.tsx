import { useId, useRef, useState } from "react";
import type { HistoryPoint } from "../lib/types";

const W = 600;
const H = 220;
const PAD = 8;

/** Interactive star-history chart: area + line, pointer crosshair with tooltip. */
export default function HistoryChart({ points }: { points: HistoryPoint[] }) {
  const gradId = `hist-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(...points.map((p) => p.stars));
  const min = Math.min(...points.map((p) => p.stars));
  const range = max - min || 1;
  const stepX = (W - PAD * 2) / (points.length - 1);
  const coords = points.map((p, i): [number, number] => [
    PAD + i * stepX,
    H - PAD - ((p.stars - min) / range) * (H - PAD * 2 - 20),
  ]);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0]},${H - PAD} L${coords[0][0]},${H - PAD} Z`;

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const frac = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    setHover(Math.round(frac * (points.length - 1)));
  };

  const hp = hover !== null ? points[hover] : null;
  const hc = hover !== null ? coords[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Star history chart"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {hc && (
          <>
            <line
              x1={hc[0]} y1={PAD} x2={hc[0]} y2={H - PAD}
              stroke="var(--color-muted)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6"
            />
            <circle
              cx={hc[0]} cy={hc[1]} r="4" fill="var(--color-accent)"
              style={{ filter: "drop-shadow(0 0 4px var(--color-accent))" }}
            />
          </>
        )}
        {/* latest point */}
        <circle
          cx={coords[coords.length - 1][0]}
          cy={coords[coords.length - 1][1]}
          r="3"
          fill="var(--color-accent)"
          style={{ filter: "drop-shadow(0 0 3px var(--color-accent))" }}
        />
      </svg>
      {hp && hc && (
        <div
          className="absolute top-0 pointer-events-none rounded-lg bg-elevated border border-border px-2.5 py-1.5 text-center shadow-card"
          style={{
            left: `${(hc[0] / W) * 100}%`,
            transform: `translateX(${hc[0] / W > 0.8 ? "-100%" : hc[0] / W < 0.2 ? "0" : "-50%"})`,
          }}
        >
          <div className="font-mono tabular-nums text-xs font-bold">{hp.stars.toLocaleString()} ★</div>
          <div className="text-[9px] text-muted whitespace-nowrap">
            {new Date(hp.t).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      )}
    </div>
  );
}
