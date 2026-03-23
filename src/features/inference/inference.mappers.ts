import { ClassificationResponse, SegmentationResponse } from "@/src/features/inference/inference.types";
import { WoundRecord } from "@/src/features/wounds/wounds.types";

export function mapClassificationToWoundTypePrediction(input: ClassificationResponse): WoundRecord["woundType"] {
  const probabilities: Record<string, number> = {};

  for (const prediction of input.predictions || []) {
    probabilities[prediction.label] = prediction.confidence;
  }

  return {
    topClassKey: input.top_prediction?.label || "Unknown",
    confidence: input.top_prediction?.confidence || 0,
    probabilities,
    source: "classification_space",
  };
}

export function createUnknownWoundTypePrediction(): WoundRecord["woundType"] {
  return {
    topClassKey: "Unknown",
    confidence: 0,
    probabilities: {},
    source: "classification_space",
  };
}

export function mapSegmentationToObservationMetrics(input: SegmentationResponse): WoundRecord["observations"][number]["metrics"] {
  return {
    totalAreaCm2: input.analysis?.total_area_cm2,
    infectionRiskScore: input.analysis?.infection_risk_score,
    tissueComposition: input.analysis?.tissue_composition,
    tissueAreaCm2: input.analysis?.tissue_area_cm2,
    tissueSizeInformation: input.analysis?.tissue_size_information,
    calibration: input.analysis?.calibration
      ? {
          method: input.analysis.calibration.method,
          marker_ids_detected: input.analysis.calibration.marker_ids_detected,
          marker_size_cm: input.analysis.calibration.marker_size_cm,
          pixels_per_cm: input.analysis.calibration.pixels_per_cm,
        }
      : undefined,
  };
}

/**
 * Returns the annotated-original overlay (tissue colours drawn on the raw photo).
 * Used as the primary "overlay" image shown on the original camera angle.
 */
export function pickOverlayDataUrl(input: SegmentationResponse): string | undefined {
  return input.overlay_image_base64 || input.processed_image_base64 || undefined;
}

/**
 * Returns the perspective-rectified tissue map — the bird's-eye view used for
 * calibrated area measurements. Only present when an ArUco marker was detected.
 */
export function pickRectifiedOverlayDataUrl(input: SegmentationResponse): string | undefined {
  return input.rectified_overlay_image_base64 || undefined;
}
