import { WoundObservation, WoundRecord } from "@/src/features/wounds/wounds.types";

export function getLatestObservation(wound: WoundRecord): WoundObservation | null {
  if (!wound.observations.length) {
    return null;
  }

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

  if (observed.length < 2) {
    return null;
  }

  const prev = observed[observed.length - 2].metrics?.totalAreaCm2 ?? 0;
  const curr = observed[observed.length - 1].metrics?.totalAreaCm2 ?? 0;
  const delta = curr - prev;

  if (delta > 0) {
    return { direction: "up", deltaCm2: delta };
  }
  if (delta < 0) {
    return { direction: "down", deltaCm2: delta };
  }
  return { direction: "flat", deltaCm2: 0 };
}
