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
    /** Area in cm² for each tissue type (from size-space API) */
    tissue_area_cm2?: Record<string, number>;
    /** Percentage + area_cm2 per tissue type (from size-space API) */
    tissue_size_information?: Record<string, { percentage: number; area_cm2: number }>;
    /** Calibration metadata from ArUco marker detection */
    calibration?: {
      method?: string;
      marker_ids_detected?: number[];
      marker_size_cm?: number;
      pixels_per_cm?: number;
      pixels_per_cm2?: number;
      [key: string]: unknown;
    };
    /** Whether an ArUco marker was successfully detected (size-space API v2+) */
    aruco_detected?: boolean;
    notes?: string[];
  };
  overlay_image_base64?: string;
  /** Perspective-rectified tissue map overlay (from size-space API) */
  rectified_overlay_image_base64?: string;
  processed_image_base64?: string;
};

export type SizeDetectionResponse = SegmentationResponse;
