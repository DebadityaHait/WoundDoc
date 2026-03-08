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
  segmentationOverlayUri?: string;
  segmentationRawMaskUri?: string;
  metrics?: {
    totalAreaCm2?: number;
    infectionRiskScore?: "Low" | "Medium" | "High" | string;
    tissueComposition?: Record<string, number>;
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
