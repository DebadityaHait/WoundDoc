export function stripDataUrlPrefix(value: string): string {
  const commaIndex = value.indexOf(",");
  return commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
}

export function ensureDataUrl(base64OrDataUrl: string, mimeType = "image/jpeg"): string {
  if (base64OrDataUrl.startsWith("data:")) {
    return base64OrDataUrl;
  }
  return `data:${mimeType};base64,${base64OrDataUrl}`;
}
