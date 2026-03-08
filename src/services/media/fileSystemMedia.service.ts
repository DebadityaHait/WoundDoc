import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import { stripDataUrlPrefix } from "@/src/lib/base64";
import { extensionFromUri } from "@/src/lib/image";

const isWeb = Platform.OS === "web";
const rootDir = `${FileSystem.documentDirectory ?? ""}wounddoc`;
const originalsDir = `${rootDir}/originals`;
const overlaysDir = `${rootDir}/overlays`;

async function ensureDir(path: string): Promise<void> {
  if (isWeb) {
    return;
  }

  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

async function ensureMediaDirs(): Promise<void> {
  await ensureDir(rootDir);
  await ensureDir(originalsDir);
  await ensureDir(overlaysDir);
}

export class FileSystemMediaService {
  async saveOriginalFromUri(sourceUri: string, woundId: string, observationId: string): Promise<string> {
    if (isWeb) {
      // Web cannot persist to app file-system; keep browser URI/reference.
      return sourceUri;
    }

    await ensureMediaDirs();
    const ext = extensionFromUri(sourceUri);
    const destination = `${originalsDir}/${woundId}_${observationId}.${ext}`;
    await FileSystem.copyAsync({ from: sourceUri, to: destination });
    return destination;
  }

  async saveOverlayFromDataUrl(dataUrl: string, woundId: string, observationId: string): Promise<string> {
    if (isWeb) {
      // Keep overlay as data URL for web rendering.
      return dataUrl;
    }

    await ensureMediaDirs();
    const payload = stripDataUrlPrefix(dataUrl);
    const destination = `${overlaysDir}/${woundId}_${observationId}.jpg`;
    await FileSystem.writeAsStringAsync(destination, payload, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return destination;
  }
}

// TODO: Swap this service with Supabase Storage media persistence.
export const fileSystemMediaService = new FileSystemMediaService();
