import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { LoadingOverlay } from "@/src/components/LoadingOverlay";
import { inferApiMessage } from "@/src/services/api/httpClient";
import { createUnknownWoundTypePrediction, mapClassificationToWoundTypePrediction, mapSegmentationToObservationMetrics, pickOverlayDataUrl } from "@/src/features/inference/inference.mappers";
import { inferenceClient } from "@/src/features/inference/inference.client";
import { WoundObservation, WoundRecord } from "@/src/features/wounds/wounds.types";
import { useWoundsStore } from "@/src/features/wounds/wounds.store";
import { createId, isNonEmpty } from "@/src/lib/validators";
import { readImageAsDataUrl } from "@/src/lib/image";
import { fileSystemMediaService } from "@/src/services/media/fileSystemMedia.service";
import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

export default function NewWoundScreen() {
  const createWound = useWoundsStore((state) => state.createWound);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [bodyLocation, setBodyLocation] = useState("");
  const [notes, setNotes] = useState("");
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

    try {
      const localOriginalUri = await fileSystemMediaService.saveOriginalFromUri(imageUri, woundId, observationId);
      const imageBase64 = await readImageAsDataUrl(localOriginalUri);

      const [classificationResult, segmentationResult] = await Promise.allSettled([
        inferenceClient.classifyWound({ imageBase64 }),
        inferenceClient.segmentWound({ imageBase64 }),
      ]);

      if (segmentationResult.status !== "fulfilled") {
        const reason = inferApiMessage(segmentationResult.reason);
        setError(reason || "Segmentation failed. Please retry with a clearer image.");
        return;
      }

      const segmentation = segmentationResult.value;
      const overlayDataUrl = pickOverlayDataUrl(segmentation);
      const overlayUri = overlayDataUrl
        ? await fileSystemMediaService.saveOverlayFromDataUrl(overlayDataUrl, woundId, observationId)
        : undefined;

      if (!overlayUri && !segmentation.analysis) {
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
        setWarning("Classification failed. Wound created with Unknown type.");
      }

      const now = new Date().toISOString();
      const firstObservation: WoundObservation = {
        id: observationId,
        woundId,
        capturedAt: now,
        originalImageUri: localOriginalUri,
        segmentationOverlayUri: overlayUri,
        metrics: mapSegmentationToObservationMetrics(segmentation),
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
          <Text style={styles.sectionTitle}>Image</Text>
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : <Text style={styles.helper}>No image selected yet.</Text>}
          <View style={styles.rowButtons}>
            <AppButton label="Gallery" variant="secondary" onPress={selectFromLibrary} />
            <AppButton label="Camera" variant="secondary" onPress={capturePhoto} />
          </View>
        </AppCard>

        <AppCard>
          <Text style={styles.sectionTitle}>Details</Text>
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
    marginBottom: spacing.sm,
  },
  previewImage: {
    width: "100%",
    height: 260,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  helper: {
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  rowButtons: {
    flexDirection: "row",
    gap: spacing.sm,
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
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
