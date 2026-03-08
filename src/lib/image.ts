import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

function mimeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  return "image/jpeg";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function readImageAsDataUrl(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    if (uri.startsWith("data:")) {
      return uri;
    }

    const response = await fetch(uri);
    const contentType = response.headers.get("content-type") || mimeFromUri(uri);
    const buffer = await response.arrayBuffer();
    const base64 = bytesToBase64(new Uint8Array(buffer));
    return `data:${contentType};base64,${base64}`;
  }

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const mime = mimeFromUri(uri);
  return `data:${mime};base64,${base64}`;
}

export function extensionFromUri(uri: string): string {
  const withoutQuery = uri.split("?")[0];
  const parts = withoutQuery.split(".");
  if (parts.length < 2) {
    return "jpg";
  }
  return parts[parts.length - 1].toLowerCase();
}
