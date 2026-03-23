export type WoundTypePrediction = {
  topClassKey: string;
  confidence: number;
  probabilities: Record<string, number>;
  source: "classification_space";
};

export type WoundObservation = {
  id: string;
  woundId: string;
  capturedAt: string;
  originalImageUri: string;
  /** Tissue-coloured overlay drawn on the original (perspective-distorted) photo. */
  segmentationOverlayUri?: string;
  /** Perspective-corrected tissue map — the rectified view used for area measurements. */
  rectifiedOverlayUri?: string;
  segmentationRawMaskUri?: string;
  metrics?: {
    totalAreaCm2?: number;
    infectionRiskScore?: "Low" | "Medium" | "High" | string;
    /** Tissue type → percentage of wound area (0–100) */
    tissueComposition?: Record<string, number>;
    /** Tissue type → area in cm² (ArUco-calibrated, from size-space API) */
    tissueAreaCm2?: Record<string, number>;
    /** Detailed per-tissue info: percentage + area_cm2 */
    tissueSizeInformation?: Record<string, { percentage: number; area_cm2: number }>;
    /** ArUco calibration metadata */
    calibration?: {
      method?: string;
      marker_ids_detected?: number[];
      marker_size_cm?: number;
      pixels_per_cm?: number;
    };
  };
  apiMeta?: {
    classificationRequestId?: string;
    segmentationRequestId?: string;
    segmentationModelVersion?: string;
    classificationModelVersion?: string;
  };
  notes?: string;
};

export type WoundRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  label: string;
  bodyLocation?: string;
  woundType: WoundTypePrediction;
  coverImageUri: string;
  observations: WoundObservation[];
  notes?: string;
};
