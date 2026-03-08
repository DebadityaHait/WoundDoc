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
  };
}

export function pickOverlayDataUrl(input: SegmentationResponse): string | undefined {
  return input.overlay_image_base64 || input.processed_image_base64;
}
