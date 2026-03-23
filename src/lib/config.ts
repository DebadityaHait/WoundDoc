function normalizeBase(url: string | undefined): string {
  if (!url) {
    return "";
  }
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export const appConfig = {
  segmentationApiBase: normalizeBase(process.env.EXPO_PUBLIC_SEGMENTATION_API_BASE),
  classificationApiBase: normalizeBase(process.env.EXPO_PUBLIC_CLASSIFICATION_API_BASE),
  /** Wound size + tissue-area API (Aerobiosys-Wound-Size-Space). Optional – falls back to segmentation API if not set. */
  sizeApiBase: normalizeBase(process.env.EXPO_PUBLIC_SIZE_API_BASE),
  /** Gemini API key for AI-powered wound analysis. */
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "",
};

export function isInferenceConfigured() {
  return Boolean(appConfig.segmentationApiBase && appConfig.classificationApiBase);
}

/** Returns the base URL to use for wound size+tissue analysis. Falls back to segmentation API. */
export function getSizeApiBase(): string {
  return appConfig.sizeApiBase || appConfig.segmentationApiBase;
}
