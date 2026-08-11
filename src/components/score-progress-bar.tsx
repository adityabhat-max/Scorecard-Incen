import type { CSSProperties } from "react";
import { RATING_COLOR, RATING_MESSAGE } from "@/lib/scoring-display";

const TICKS = [0, 20, 40, 60, 80, 100];

// Adapted from a reference mock (numeral + flagged horizontal bar + ticks +
// tier message). Kept as a Server Component — the fill/flag entrance
// animation runs in pure CSS via the --fill-width custom property and the
// score-bar-grow/score-flag-slide keyframes in globals.css, no client JS
// needed. Tier copy keys off the app's real 5 rating bands (Exceptional
// .. Unsatisfactory), not the reference's own generic 9-band scale, so
// there's one taxonomy across the whole app rather than two.
export function ScoreProgressBar({ score, rating }: { score: number; rating: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = RATING_COLOR[rating] ?? "var(--color-primary)";
  const message = RATING_MESSAGE[rating] ?? "";
  const fillVar = { "--fill-width": `${clamped}%` } as CSSProperties;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        <span className="font-sans text-3xl font-semibold text-foreground">{clamped}</span>
        <span className="font-mono text-sm text-muted-foreground">/100</span>
      </div>

      <div className="relative mt-8 mb-1">
        <div
          className="score-bar-flag absolute top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ ...fillVar, animation: "score-flag-slide 700ms cubic-bezier(0.22,1,0.36,1) forwards" }}
        >
          <div
            className="rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold whitespace-nowrap text-background"
            style={{ background: color }}
          >
            {clamped}
          </div>
          <div
            className="-mt-px h-0 w-0 border-x-4 border-t-[5px] border-x-transparent"
            style={{ borderTopColor: color }}
          />
        </div>

        <div className="relative h-2.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="score-bar-fill absolute inset-y-0 left-0 rounded-full"
            style={{ ...fillVar, background: color, animation: "score-bar-grow 700ms cubic-bezier(0.22,1,0.36,1) forwards" }}
          />
        </div>

        <div className="relative mt-1 h-4">
          {TICKS.map((t) => (
            <span
              key={t}
              className="absolute top-0 -translate-x-1/2 font-mono text-[0.65rem] text-muted-foreground"
              style={{ left: `${t}%` }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-3 font-heading text-lg font-semibold text-foreground">{rating}</p>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
