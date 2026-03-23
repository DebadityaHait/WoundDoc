import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { EmptyState } from "@/src/components/EmptyState";
import { LoadingOverlay } from "@/src/components/LoadingOverlay";
import { inferenceClient } from "@/src/features/inference/inference.client";
import { mapSegmentationToObservationMetrics, pickOverlayDataUrl, pickRectifiedOverlayDataUrl } from "@/src/features/inference/inference.mappers";
import { WoundObservation } from "@/src/features/wounds/wounds.types";
import { useWoundsStore } from "@/src/features/wounds/wounds.store";
import { readImageAsDataUrl } from "@/src/lib/image";
import { createId, isNonEmpty } from "@/src/lib/validators";
import { inferApiMessage } from "@/src/services/api/httpClient";
import { fileSystemMediaService } from "@/src/services/media/fileSystemMedia.service";
import { appConfig } from "@/src/lib/config";
import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

export default function AddObservationScreen() {
  const { woundId } = useLocalSearchParams<{ woundId: string }>();
  const wounds = useWoundsStore((state) => state.wounds);
  const addObservation = useWoundsStore((state) => state.addObservation);

  const wound = useMemo(() => wounds.find((item) => item.id === woundId), [woundId, wounds]);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [markerSizeCm, setMarkerSizeCm] = useState("2.0");
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!wound) {
    return (
      <View style={styles.container}>
        <EmptyState title="Wound not found" description="Return to dashboard and select a valid wound." />
      </View>
    );
  }

  const selectFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setError(null);
    }
  };

  const capturePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is required to capture an observation.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setError(null);
    }
  };

  const saveObservation = async () => {
    if (!imageUri) {
      setError("Choose an image first.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSizeWarning(null);

    const observationId = createId("obs");

    const parsedMarkerSize = parseFloat(markerSizeCm);
    const validMarkerSize = !isNaN(parsedMarkerSize) && parsedMarkerSize > 0 ? parsedMarkerSize : 2.0;

    try {
      const localOriginalUri = await fileSystemMediaService.saveOriginalFromUri(imageUri, wound.id, observationId);
      const imageBase64 = await readImageAsDataUrl(localOriginalUri);

      // Run basic segmentation and size+tissue detection in parallel.
      const [segmentationResult, sizeResult] = await Promise.allSettled([
        inferenceClient.segmentWound({ imageBase64 }),
        inferenceClient.detectWoundSize({ imageBase64, markerSizeCm: validMarkerSize }),
      ]);

      if (segmentationResult.status !== "fulfilled") {
        setError("Segmentation returned no overlay and no metrics. Try another image.");
        return;
      }

      const segmentation = segmentationResult.value;

      // Use size-detection result when available (richer: tissue areas, ArUco calibration).
      const primaryResult = sizeResult.status === "fulfilled" ? sizeResult.value : segmentation;

      if (sizeResult.status !== "fulfilled") {
        const sizeReason = inferApiMessage((sizeResult as PromiseRejectedResult).reason);
        setSizeWarning(
          sizeReason?.includes("ArUco")
            ? "No ArUco marker detected – size measurements unavailable. Place a 4×4 ArUco marker next to the wound for calibrated measurements."
            : "Size detection failed. Basic segmentation metrics will be used instead."
        );
      }

      const overlayDataUrl = pickOverlayDataUrl(primaryResult);
      const rectifiedDataUrl = pickRectifiedOverlayDataUrl(primaryResult);

      if (!overlayDataUrl && !rectifiedDataUrl && !primaryResult.analysis) {
        setError("Segmentation returned no overlay and no metrics. Try another image.");
        return;
      }

      const [overlayUri, rectifiedOverlayUri] = await Promise.all([
        overlayDataUrl
          ? fileSystemMediaService.saveOverlayFromDataUrl(overlayDataUrl, wound.id, observationId)
          : Promise.resolve(undefined),
        rectifiedDataUrl
          ? fileSystemMediaService.saveRectifiedOverlayFromDataUrl(rectifiedDataUrl, wound.id, observationId)
          : Promise.resolve(undefined),
      ]);

      const observation: WoundObservation = {
        id: observationId,
        woundId: wound.id,
        capturedAt: new Date().toISOString(),
        originalImageUri: localOriginalUri,
        segmentationOverlayUri: overlayUri,
        rectifiedOverlayUri,
        metrics: mapSegmentationToObservationMetrics(primaryResult),
        apiMeta: {
          segmentationRequestId: segmentation.request_id,
          segmentationModelVersion: segmentation.model_info?.name,
        },
        notes: isNonEmpty(notes) ? notes.trim() : undefined,
      };

      await addObservation(wound.id, observation);
      router.replace({ pathname: "/(app)/wounds/[woundId]", params: { woundId: wound.id } });
    } catch (caught) {
      setError(inferApiMessage(caught));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <AppCard>
          <Text style={styles.sectionTitle}>Capture Follow-up</Text>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderIcon}>📷</Text>
              <Text style={styles.placeholderText}>Tap to add image</Text>
            </View>
          )}
          
          <Text style={styles.tip}>
            <Text style={{ fontWeight: "600" }}>Tip:</Text> Place a 4×4 ArUco marker (DICT_4X4_50) next to the wound for calibrated size + tissue-area measurements with perspective correction.
          </Text>

          <View style={styles.rowButtons}>
            <AppButton label="Gallery" variant="secondary" onPress={selectFromLibrary} />
            <AppButton label="Camera" variant="secondary" onPress={capturePhoto} />
          </View>
          <AppButton
            label="📐 Show ArUco Marker"
            variant="secondary"
            onPress={() => router.push("/(app)/aruco-marker")}
          />
        </AppCard>

        <AppCard>
          <View style={styles.sectionTitleBar}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Marker Size</Text>
          </View>
          <Text style={styles.helper}>Enter the real side length of your ArUco marker (default 2.0 cm).</Text>
          <TextInput
            style={styles.input}
            placeholder="Marker side length in cm (e.g. 2.0)"
            placeholderTextColor={colors.textMuted}
            value={markerSizeCm}
            onChangeText={setMarkerSizeCm}
            keyboardType="decimal-pad"
          />
        </AppCard>

        <AppCard>
          <TextInput
            style={[styles.input, styles.multiLine]}
            placeholder="Optional notes"
            placeholderTextColor={colors.textMuted}
            multiline
            value={notes}
            onChangeText={setNotes}
          />
          {sizeWarning ? <Text style={styles.sizeWarning}>{sizeWarning}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton label="Save Observation" loading={isSaving} onPress={saveObservation} />
        </AppCard>
      </ScrollView>
      <LoadingOverlay visible={isSaving} message="Running segmentation..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  sectionTitleBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionAccent: {
    width: 4,
    height: 20,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  previewImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  imagePlaceholder: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
  helper: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  tip: {
    fontSize: 13,
    color: colors.text,
    backgroundColor: `${colors.primary}19`,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  rowButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  multiLine: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  sizeWarning: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
});
