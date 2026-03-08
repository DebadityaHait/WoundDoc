function normalizeBase(url: string | undefined): string {
  if (!url) {
    return "";
  }
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export const appConfig = {
  segmentationApiBase: normalizeBase(process.env.EXPO_PUBLIC_SEGMENTATION_API_BASE),
  classificationApiBase: normalizeBase(process.env.EXPO_PUBLIC_CLASSIFICATION_API_BASE),
};

export function isInferenceConfigured() {
  return Boolean(appConfig.segmentationApiBase && appConfig.classificationApiBase);
}
