import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { EmptyState } from "@/src/components/EmptyState";
import { ImageCompareToggle } from "@/src/components/ImageCompareToggle";
import { SectionHeader } from "@/src/components/SectionHeader";
import { StatChip } from "@/src/components/StatChip";
import { WoundTypeBadge } from "@/src/components/WoundTypeBadge";
import { useWoundsStore } from "@/src/features/wounds/wounds.store";
import { computeAreaTrend } from "@/src/features/wounds/woundSelectors";
import { formatLongDateTime } from "@/src/lib/date";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

export default function WoundDetailScreen() {
  const { woundId } = useLocalSearchParams<{ woundId: string }>();
  const wounds = useWoundsStore((state) => state.wounds);
  const wound = useMemo(() => wounds.find((item) => item.id === woundId), [woundId, wounds]);
  const trend = wound ? computeAreaTrend(wound) : null;

  if (!wound) {
    return (
      <View style={styles.container}>
        <EmptyState title="Wound not found" description="It may have been deleted from local storage." />
      </View>
    );
  }

  const observations = [...wound.observations].sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
  );

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={observations}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <AppCard>
            <SectionHeader title={wound.label} subtitle={wound.bodyLocation || "Body location not specified"} />
            <WoundTypeBadge label={wound.woundType.topClassKey} />
            {trend ? (
              <Text style={styles.trendText}>
                Area trend: {trend.direction === "down" ? "decreased" : trend.direction === "up" ? "increased" : "unchanged"} by {Math.abs(trend.deltaCm2).toFixed(2)} cm²
              </Text>
            ) : (
              <Text style={styles.subtle}>Add at least two measurements to compute area trend.</Text>
            )}
            <AppButton
              label="Add Observation"
              onPress={() => router.push({ pathname: "/(app)/wounds/add-observation", params: { woundId: wound.id } })}
            />
          </AppCard>
        </View>
      }
      renderItem={({ item }) => (
        <AppCard>
          <Text style={styles.cardTitle}>{formatLongDateTime(item.capturedAt)}</Text>
          <ImageCompareToggle originalUri={item.originalImageUri} overlayUri={item.segmentationOverlayUri} />
          <View style={styles.chipsRow}>
            {item.metrics?.totalAreaCm2 !== undefined ? <StatChip label={`Area ${item.metrics.totalAreaCm2.toFixed(2)} cm²`} /> : null}
            {item.metrics?.infectionRiskScore ? <StatChip label={`Risk ${item.metrics.infectionRiskScore}`} tone="warning" /> : null}
          </View>
          {item.metrics?.tissueComposition ? (
            <View style={styles.tissueBlock}>
              {Object.entries(item.metrics.tissueComposition)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([label, value]) => (
                  <Text key={label} style={styles.subtle}>{`${label}: ${value.toFixed(1)}%`}</Text>
                ))}
            </View>
          ) : null}
          <Text style={styles.noteLabel}>Observation Notes</Text>
          <Text style={styles.subtle}>{item.notes || "No notes for this observation."}</Text>
        </AppCard>
      )}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tissueBlock: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  noteLabel: {
    marginTop: spacing.sm,
    color: colors.text,
    fontWeight: "600",
  },
  subtle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  trendText: {
    color: colors.primary,
    fontWeight: "700",
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
});
