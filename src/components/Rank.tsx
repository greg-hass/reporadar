/** Ghost leaderboard numeral; rank 1 gets the brand gradient. */
export default function Rank({ n }: { n: number }) {
  return (
    <span
      className={`font-mono tabular-nums text-lg sm:text-xl font-extrabold w-7 shrink-0 text-center ${
        n === 1 ? "gradient-text" : "text-muted/45"
      }`}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}
