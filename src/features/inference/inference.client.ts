import { appConfig } from "@/src/lib/config";
import { postJson } from "@/src/services/api/httpClient";
import { ClassificationResponse, SegmentationResponse } from "@/src/features/inference/inference.types";

type InferenceImageInput = {
  imageBase64: string;
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
}

export const inferenceClient = new InferenceClient();
