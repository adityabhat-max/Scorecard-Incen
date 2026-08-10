// Client-safe mirror of supabase/migrations/0003_scoring.sql — used for
// what-if simulation in the UI (e.g. "improvement action plan" point
// estimates) and for scripts/verify-scoring.ts. The database function is
// still the authoritative source of truth for scores actually stored;
// keep this in sync with the SQL by hand if the formula changes.
import type { KpiConfigShape } from "@/lib/database.types";

export type RawKpiValues = Record<keyof KpiConfigShape["kpis"], number | null>;

export interface ScoreResult {
  kpiScores: Record<string, number | null>;
  categoryScores: { attendance: number; service: number; customer: number };
  finalRaw: number;
  final: number;
  rating: string;
}

export function scoreSingleKpi(
  value: number | null | undefined,
  thresholds: { min?: number | null; max?: number | null; score: number }[],
  direction: "higher_better" | "lower_better",
): number | null {
  if (value === null || value === undefined) return null;
  for (const t of thresholds) {
    if (direction === "higher_better") {
      if (t.min === null || t.min === undefined || value >= t.min) return t.score;
    } else {
      if (t.max === null || t.max === undefined || value <= t.max) return t.score;
    }
  }
  return null;
}

export function calculateScore(raw: RawKpiValues, config: KpiConfigShape): ScoreResult {
  const kpiScores: Record<string, number | null> = {};
  for (const [key, def] of Object.entries(config.kpis)) {
    kpiScores[key] = scoreSingleKpi(raw[key as keyof RawKpiValues], def.thresholds, def.direction);
  }

  const categoryScores = { attendance: 0, service: 0, customer: 0 };
  for (const cat of Object.keys(config.categories) as (keyof typeof categoryScores)[]) {
    let sum = 0;
    for (const [key, def] of Object.entries(config.kpis)) {
      if (def.category === cat) sum += (kpiScores[key] ?? 0) * def.weight;
    }
    categoryScores[cat] = Math.round(sum * 100) / 100;
  }

  let finalRaw = 0;
  for (const [cat, weight] of Object.entries(config.categories)) {
    finalRaw += categoryScores[cat as keyof typeof categoryScores] * weight;
  }
  const final = Math.round(finalRaw);

  // Rating band uses the UNROUNDED score — verified against real report
  // data (a raw 69.8 still rates "Needs Improvement" even though it
  // displays as 70).
  let rating = "Unsatisfactory";
  for (const band of config.rating_bands) {
    if (band.min === null || finalRaw >= band.min) {
      rating = band.label;
      break;
    }
  }

  return { kpiScores, categoryScores, finalRaw, final, rating };
}

// Best-case value for a KPI: the raw value that lands it in its top-scoring
// threshold band, used to simulate "what if this KPI were maxed out".
export function bestCaseValue(def: KpiConfigShape["kpis"][keyof KpiConfigShape["kpis"]]): number {
  if (def.direction === "higher_better") {
    const best = def.thresholds.find((t) => t.min !== null && t.min !== undefined);
    return best?.min ?? 100;
  }
  const best = def.thresholds[0];
  return best?.max ?? 0;
}

export interface ImprovementOpportunity {
  kpiKey: string;
  currentValue: number | null;
  currentScore: number | null;
  targetValue: number;
  pointGain: number;
}

// Ranks KPIs (excluding ones already at their max score) by how many final
// points would be gained by maxing that single KPI out, all else equal.
export function rankImprovementOpportunities(
  raw: RawKpiValues,
  config: KpiConfigShape,
): ImprovementOpportunity[] {
  const baseline = calculateScore(raw, config);
  const opportunities: ImprovementOpportunity[] = [];

  for (const [key, def] of Object.entries(config.kpis)) {
    const currentScore = baseline.kpiScores[key];
    const maxPossibleScore = Math.max(...def.thresholds.map((t) => t.score));
    if (currentScore === null || currentScore >= maxPossibleScore) continue;

    const targetValue = bestCaseValue(def);
    const simulatedRaw = { ...raw, [key]: targetValue } as RawKpiValues;
    const simulated = calculateScore(simulatedRaw, config);
    const pointGain = simulated.final - baseline.final;

    if (pointGain > 0) {
      opportunities.push({
        kpiKey: key,
        currentValue: raw[key as keyof RawKpiValues],
        currentScore,
        targetValue,
        pointGain,
      });
    }
  }

  return opportunities.sort((a, b) => b.pointGain - a.pointGain);
}
