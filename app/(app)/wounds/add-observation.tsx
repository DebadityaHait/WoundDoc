import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { EmptyState } from "@/src/components/EmptyState";
import { LoadingOverlay } from "@/src/components/LoadingOverlay";
import { inferenceClient } from "@/src/features/inference/inference.client";
import { mapSegmentationToObservationMetrics, pickOverlayDataUrl } from "@/src/features/inference/inference.mappers";
import { WoundObservation } from "@/src/features/wounds/wounds.types";
import { useWoundsStore } from "@/src/features/wounds/wounds.store";
import { readImageAsDataUrl } from "@/src/lib/image";
import { createId, isNonEmpty } from "@/src/lib/validators";
import { inferApiMessage } from "@/src/services/api/httpClient";
import { fileSystemMediaService } from "@/src/services/media/fileSystemMedia.service";
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

    const observationId = createId("obs");

    try {
      const localOriginalUri = await fileSystemMediaService.saveOriginalFromUri(imageUri, wound.id, observationId);
      const imageBase64 = await readImageAsDataUrl(localOriginalUri);
      const segmentation = await inferenceClient.segmentWound({ imageBase64 });
      const overlayDataUrl = pickOverlayDataUrl(segmentation);

      if (!overlayDataUrl && !segmentation.analysis) {
        setError("Segmentation returned no overlay and no metrics. Try another image.");
        return;
      }

      const overlayUri = overlayDataUrl
        ? await fileSystemMediaService.saveOverlayFromDataUrl(overlayDataUrl, wound.id, observationId)
        : undefined;

      const observation: WoundObservation = {
        id: observationId,
        woundId: wound.id,
        capturedAt: new Date().toISOString(),
        originalImageUri: localOriginalUri,
        segmentationOverlayUri: overlayUri,
        metrics: mapSegmentationToObservationMetrics(segmentation),
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
          <Text style={styles.sectionTitle}>Capture follow-up</Text>
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : <Text style={styles.helper}>No observation image selected yet.</Text>}
          <View style={styles.rowButtons}>
            <AppButton label="Gallery" variant="secondary" onPress={selectFromLibrary} />
            <AppButton label="Camera" variant="secondary" onPress={capturePhoto} />
          </View>
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
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
