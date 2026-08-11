// Circular meter: fill carries severity (gold -> amber -> rose), the
// unfilled track is the same color at low opacity so the state reads across
// the whole ring, not just the filled arc. Center number stays in the sans
// UI font, never the serif heading face, per the "hero figure" convention.
import { RATING_COLOR } from "@/lib/scoring-display";

export function ScoreRing({
  score,
  rating,
  size = 96,
  strokeWidth,
  showDenominator = false,
}: {
  score: number;
  rating: string;
  size?: number;
  strokeWidth?: number;
  showDenominator?: boolean;
}) {
  const stroke = strokeWidth ?? Math.max(4, Math.round(size * 0.08));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);
  const color = RATING_COLOR[rating] ?? "var(--color-primary)";
  const fontSize = Math.round(size * (size >= 120 ? 0.3 : 0.34));

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`color-mix(in srgb, ${color} 18%, transparent)`}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className="font-sans font-semibold text-foreground"
          style={{ fontSize }}
        >
          {Math.round(clamped)}
        </span>
        {showDenominator && (
          <span className="mt-0.5 text-[0.65rem] text-muted-foreground">/ 100</span>
        )}
      </div>
    </div>
  );
}
