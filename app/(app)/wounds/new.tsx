import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { LoadingOverlay } from "@/src/components/LoadingOverlay";
import { inferApiMessage } from "@/src/services/api/httpClient";
import { createUnknownWoundTypePrediction, mapClassificationToWoundTypePrediction, mapSegmentationToObservationMetrics, pickOverlayDataUrl, pickRectifiedOverlayDataUrl } from "@/src/features/inference/inference.mappers";
import { inferenceClient } from "@/src/features/inference/inference.client";
import { WoundObservation, WoundRecord } from "@/src/features/wounds/wounds.types";
import { useWoundsStore } from "@/src/features/wounds/wounds.store";
import { createId, isNonEmpty } from "@/src/lib/validators";
import { readImageAsDataUrl } from "@/src/lib/image";
import { fileSystemMediaService } from "@/src/services/media/fileSystemMedia.service";
import { appConfig } from "@/src/lib/config";
import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

export default function NewWoundScreen() {
  const createWound = useWoundsStore((state) => state.createWound);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [bodyLocation, setBodyLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [markerSizeCm, setMarkerSizeCm] = useState("2.0");
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setError("Camera permission is required to capture a wound image.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setError(null);
    }
  };

  const analyzeAndCreate = async () => {
    if (!imageUri) {
      setError("Choose an image first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setWarning(null);

    const woundId = createId("wound");
    const observationId = createId("obs");

    const parsedMarkerSize = parseFloat(markerSizeCm);
    const validMarkerSize = !isNaN(parsedMarkerSize) && parsedMarkerSize > 0 ? parsedMarkerSize : 2.0;

    try {
      const localOriginalUri = await fileSystemMediaService.saveOriginalFromUri(imageUri, woundId, observationId);
      const imageBase64 = await readImageAsDataUrl(localOriginalUri);

      // Run classification, basic segmentation, and size+tissue detection in parallel.
      // Size detection uses the Wound-Size-Space API (ArUco-calibrated, tissue-wise areas).
      const [classificationResult, segmentationResult, sizeResult] = await Promise.allSettled([
        inferenceClient.classifyWound({ imageBase64 }),
        inferenceClient.segmentWound({ imageBase64 }),
        inferenceClient.detectWoundSize({ imageBase64, markerSizeCm: validMarkerSize }),
      ]);

      if (segmentationResult.status !== "fulfilled") {
        const reason = inferApiMessage(segmentationResult.reason);
        setError(reason || "Segmentation failed. Please retry with a clearer image.");
        return;
      }

      const segmentation = segmentationResult.value;

      // Prefer the richer size-detection result when available (it includes tissue areas).
      const primaryResult = sizeResult.status === "fulfilled" ? sizeResult.value : segmentation;

      if (sizeResult.status !== "fulfilled") {
        const sizeReason = inferApiMessage((sizeResult as PromiseRejectedResult).reason);
        setWarning(
          sizeReason?.includes("ArUco")
            ? "No ArUco marker detected – size measurements unavailable. Place a 4×4 ArUco marker next to the wound for calibrated measurements."
            : "Size detection failed. Basic segmentation metrics will be used instead."
        );
      }

      const overlayDataUrl = pickOverlayDataUrl(primaryResult);
      const rectifiedDataUrl = pickRectifiedOverlayDataUrl(primaryResult);

      const [overlayUri, rectifiedOverlayUri] = await Promise.all([
        overlayDataUrl
          ? fileSystemMediaService.saveOverlayFromDataUrl(overlayDataUrl, woundId, observationId)
          : Promise.resolve(undefined),
        rectifiedDataUrl
          ? fileSystemMediaService.saveRectifiedOverlayFromDataUrl(rectifiedDataUrl, woundId, observationId)
          : Promise.resolve(undefined),
      ]);

      if (!overlayUri && !rectifiedOverlayUri && !primaryResult.analysis) {
        setError("Segmentation response did not include usable analysis. Please retry.");
        return;
      }

      let woundType = createUnknownWoundTypePrediction();
      let classificationRequestId: string | undefined;
      let classificationModelVersion: string | undefined;

      if (classificationResult.status === "fulfilled") {
        woundType = mapClassificationToWoundTypePrediction(classificationResult.value);
        classificationRequestId = classificationResult.value.request_id;
        classificationModelVersion = classificationResult.value.model_info?.name;
      } else {
        setWarning((prev) => prev ?? "Classification failed. Wound created with Unknown type.");
      }

      const now = new Date().toISOString();
      const firstObservation: WoundObservation = {
        id: observationId,
        woundId,
        capturedAt: now,
        originalImageUri: localOriginalUri,
        segmentationOverlayUri: overlayUri,
        rectifiedOverlayUri,
        metrics: mapSegmentationToObservationMetrics(primaryResult),
        apiMeta: {
          classificationRequestId,
          classificationModelVersion,
          segmentationRequestId: segmentation.request_id,
          segmentationModelVersion: segmentation.model_info?.name,
        },
        notes: isNonEmpty(notes) ? notes.trim() : undefined,
      };

      const wound: WoundRecord = {
        id: woundId,
        createdAt: now,
        updatedAt: now,
        label: isNonEmpty(label) ? label.trim() : "Untitled wound",
        bodyLocation: isNonEmpty(bodyLocation) ? bodyLocation.trim() : undefined,
        woundType,
        coverImageUri: localOriginalUri,
        observations: [firstObservation],
        notes: isNonEmpty(notes) ? notes.trim() : undefined,
      };

      await createWound(wound);
      router.replace({
        pathname: "/(app)/wounds/[woundId]",
        params: { woundId },
      });
    } catch (caught) {
      setError(inferApiMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <AppCard>
          <Text style={styles.sectionTitle}>Wound Image</Text>
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
          <View style={styles.sectionTitleBar}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Details</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Label (e.g. Right heel wound)"
            placeholderTextColor={colors.textMuted}
            value={label}
            onChangeText={setLabel}
          />
          <TextInput
            style={styles.input}
            placeholder="Body location"
            placeholderTextColor={colors.textMuted}
            value={bodyLocation}
            onChangeText={setBodyLocation}
          />
          <TextInput
            style={[styles.input, styles.multiLine]}
            placeholder="Optional notes"
            placeholderTextColor={colors.textMuted}
            multiline
            value={notes}
            onChangeText={setNotes}
          />
          {warning ? <Text style={styles.warning}>{warning}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton label="Analyze & Create Wound" onPress={analyzeAndCreate} loading={isSubmitting} />
        </AppCard>
      </ScrollView>
      <LoadingOverlay visible={isSubmitting} message="Running classification and segmentation..." />
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
  warning: {
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
