import { appConfig, getSizeApiBase } from "@/src/lib/config";
import { postJson } from "@/src/services/api/httpClient";
import { ClassificationResponse, SegmentationResponse, SizeDetectionResponse } from "@/src/features/inference/inference.types";

type InferenceImageInput = {
  imageBase64: string;
};

type SizeDetectionInput = {
  imageBase64: string;
  /** Real-world side length of the ArUco marker in cm. Defaults to 2.0 cm on the server. */
  markerSizeCm?: number;
};

export class InferenceClient {
  async classifyWound(input: InferenceImageInput): Promise<ClassificationResponse> {
    if (!appConfig.classificationApiBase) {
      throw new Error("Classification API base URL is not configured.");
    }

    return postJson<ClassificationResponse>(
      `${appConfig.classificationApiBase}/api/classify`,
      { image_base64: input.imageBase64 },
      { timeoutMs: 20_000, retryNetwork: true },
    );
  }

  async segmentWound(input: InferenceImageInput): Promise<SegmentationResponse> {
    if (!appConfig.segmentationApiBase) {
      throw new Error("Segmentation API base URL is not configured.");
    }

    return postJson<SegmentationResponse>(
      `${appConfig.segmentationApiBase}/api/segment`,
      { image_base64: input.imageBase64 },
      { timeoutMs: 45_000, retryNetwork: true },
    );
  }

  /**
   * Calls the Wound Size + Tissue Analysis API (Aerobiosys-Wound-Size-Space).
   * Requires a visible 4×4 ArUco marker in the image for calibrated measurements.
   * Uses EXPO_PUBLIC_SIZE_API_BASE if set, otherwise falls back to EXPO_PUBLIC_SEGMENTATION_API_BASE.
   */
  async detectWoundSize(input: SizeDetectionInput): Promise<SizeDetectionResponse> {
    const base = getSizeApiBase();
    if (!base) {
      throw new Error("Size detection API base URL is not configured.");
    }

    const body: Record<string, unknown> = { image_base64: input.imageBase64 };
    if (input.markerSizeCm !== undefined && input.markerSizeCm > 0) {
      body.marker_size_cm = input.markerSizeCm;
    }

    return postJson<SizeDetectionResponse>(
      `${base}/api/segment`,
      body,
      { timeoutMs: 60_000, retryNetwork: true },
    );
  }
}

export const inferenceClient = new InferenceClient();
