export type ClassificationResponse = {
  status: string;
  request_id: string;
  model_info?: {
    name?: string;
    num_classes?: number;
    [key: string]: unknown;
  };
  top_prediction: {
    label: string;
    confidence: number;
  };
  predictions: Array<{
    label: string;
    confidence: number;
  }>;
};

export type SegmentationResponse = {
  status: string;
  request_id: string;
  model_info?: {
    name?: string;
    input_size?: number[];
    [key: string]: unknown;
  };
  analysis?: {
    total_area_cm2?: number;
    infection_risk_score?: string;
    tissue_composition?: Record<string, number>;
  };
  overlay_image_base64?: string;
  processed_image_base64?: string;
};
