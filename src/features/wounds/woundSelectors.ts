import { WoundObservation, WoundRecord } from "@/src/features/wounds/wounds.types";
import type { SparklinePoint } from "@/src/components/AreaSparkline";
import type { TissueSnapshot } from "@/src/components/TissueHistoryChart";

export function getLatestObservation(wound: WoundRecord): WoundObservation | null {
  if (!wound.observations.length) return null;
  return [...wound.observations].sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
  )[0];
}

export function getObservationCount(wound: WoundRecord): number {
  return wound.observations.length;
}

export function getLatestAreaCm2(wound: WoundRecord): number | null {
  const latest = getLatestObservation(wound);
  return latest?.metrics?.totalAreaCm2 ?? null;
}

export function computeAreaTrend(
  wound: WoundRecord,
): { direction: "up" | "down" | "flat"; deltaCm2: number } | null {
  const observed = [...wound.observations]
    .filter((item) => typeof item.metrics?.totalAreaCm2 === "number")
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());

  if (observed.length < 2) return null;

  const prev = observed[observed.length - 2].metrics?.totalAreaCm2 ?? 0;
  const curr = observed[observed.length - 1].metrics?.totalAreaCm2 ?? 0;
  const delta = curr - prev;

  if (delta > 0) return { direction: "up", deltaCm2: delta };
  if (delta < 0) return { direction: "down", deltaCm2: delta };
  return { direction: "flat", deltaCm2: 0 };
}

/** Returns chronological area data points for the sparkline chart. */
export function getAreaHistory(wound: WoundRecord): SparklinePoint[] {
  return wound.observations
    .filter((o) => o.metrics?.totalAreaCm2 != null)
    .map((o) => ({
      date: o.capturedAt,
      areaCm2: o.metrics!.totalAreaCm2!,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Returns tissue composition snapshots for the stacked history chart. */
export function getTissueHistory(wound: WoundRecord): TissueSnapshot[] {
  return wound.observations
    .filter(
      (o) => o.metrics?.tissueSizeInformation != null || o.metrics?.tissueComposition != null,
    )
    .map((o): TissueSnapshot => {
      // Prefer calibrated tissue areas (cm²) from size-space API
      if (o.metrics?.tissueSizeInformation) {
        const tissue: Record<string, number> = {};
        for (const [key, info] of Object.entries(o.metrics.tissueSizeInformation)) {
          tissue[key] = info.area_cm2;
        }
        return {
          date: o.capturedAt,
          tissue,
          isPercentage: false,
          totalAreaCm2: o.metrics.totalAreaCm2,
        };
      }
      return {
        date: o.capturedAt,
        tissue: o.metrics!.tissueComposition!,
        isPercentage: true,
        totalAreaCm2: o.metrics?.totalAreaCm2,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Aggregate stats across all observations for the summary card. */
export function getWoundStats(wound: WoundRecord): {
  firstAreaCm2: number | null;
  latestAreaCm2: number | null;
  minAreaCm2: number | null;
  maxAreaCm2: number | null;
  totalReductionPct: number | null;
  daysSinceFirst: number | null;
} {
  const history = getAreaHistory(wound);
  if (history.length === 0) {
    return {
      firstAreaCm2: null,
      latestAreaCm2: null,
      minAreaCm2: null,
      maxAreaCm2: null,
      totalReductionPct: null,
      daysSinceFirst: null,
    };
  }
  const areas = history.map((h) => h.areaCm2);
  const first = areas[0];
  const latest = areas[areas.length - 1];
  const reductionPct = first > 0 ? ((first - latest) / first) * 100 : null;
  const daysSinceFirst = Math.round(
    (new Date(history[history.length - 1].date).getTime() -
      new Date(history[0].date).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  return {
    firstAreaCm2: first,
    latestAreaCm2: latest,
    minAreaCm2: Math.min(...areas),
    maxAreaCm2: Math.max(...areas),
    totalReductionPct: reductionPct,
    daysSinceFirst,
  };
}
