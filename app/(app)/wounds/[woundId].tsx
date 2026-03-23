import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { AreaSparkline } from "@/src/components/AreaSparkline";
import { EmptyState } from "@/src/components/EmptyState";
import { ImageCompareToggle } from "@/src/components/ImageCompareToggle";
import { StatChip } from "@/src/components/StatChip";
import { TissueHistoryChart } from "@/src/components/TissueHistoryChart";
import { WoundTypeBadge } from "@/src/components/WoundTypeBadge";
import { WoundTypePickerModal } from "@/src/components/WoundTypePickerModal";
import { useWoundsStore } from "@/src/features/wounds/wounds.store";
import { computeAreaTrend, getAreaHistory, getTissueHistory, getWoundStats } from "@/src/features/wounds/woundSelectors";
import { formatLongDateTime } from "@/src/lib/date";
import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

/**
 * Tissue type → display color.
 *
 * Covers keys from BOTH backend APIs:
 *
 * 1. Aerobiosys-Wound-Size-Space (app.py DISPLAY_NAMES):
 *    necrotic_black, devitalized_brown, granulation_red, slough_yellow,
 *    infected_green, bruising_purple, epithelial_pink, fibrin_white, unclassified_other
 *
 * 2. Aerobiosys-Wound-Analysis (app.py TISSUE_TYPES display_name values):
 *    eschar_necrotic_tissue, aged_granulation_old_blood, healthy_granulation_tissue,
 *    hematoma_ischemia_bruising, necrotic_tissue_with_bruising,
 *    hematoma_ischemia_severe_bruising, fibrin_devitalized_connective_tissue,
 *    infected_tissue_eg_pseudomonas, hemosiderin_staining_drying_exudate,
 *    early_bruising_poor_perfusion, slough_with_potential_infection,
 *    early_fragile_epithelializing_tissue, fibrin_devitalized_tissue,
 *    mixed_devitalized_tissue_slough_eschar, serosanguinous_exudate_blood_serum_mix,
 *    serosanguinous_exudate_dilute, healthy_granulation_fresh_bleeding,
 *    fibrin, slough_fibrinous_exudate, fragile_granulation_epithelial_tissue,
 *    hypergranulation_irritated_tissue, slough_serous_exudate,
 *    epithelializing_tissue, purulent_exudate_infected_slough, fibrin_macerated_skin
 */
const TISSUE_COLORS: Record<string, string> = {
  // ── Wound-Size-Space keys ────────────────────────────────────────────────
  necrotic_black:                        "#1a1a1a",
  devitalized_brown:                     "#996633",
  granulation_red:                       "#dc143c",
  slough_yellow:                         "#ffd700",
  infected_green:                        "#32cd32",
  bruising_purple:                       "#8a2be2",
  epithelial_pink:                       "#ff69b4",
  fibrin_white:                          "#f5f5f5",
  unclassified_other:                    "#b4b4b4",
  // ── Wound-Analysis keys (display_name from TISSUE_TYPES) ─────────────────
  eschar_necrotic_tissue:                "#1a1a1a",
  aged_granulation_old_blood:            "#8b0000",
  healthy_granulation_tissue:            "#dc143c",
  healthy_granulation_fresh_bleeding:    "#ff3333",
  hematoma_ischemia_bruising:            "#8a2be2",
  necrotic_tissue_with_bruising:         "#4b0082",
  hematoma_ischemia_severe_bruising:     "#6a0dad",
  early_bruising_poor_perfusion:         "#9370db",
  fibrin_devitalized_connective_tissue:  "#d3d3d3",
  fibrin_devitalized_tissue:             "#c8c8c8",
  fibrin:                                "#e8e8e8",
  fibrin_macerated_skin:                 "#f0f0f0",
  slough_with_potential_infection:       "#c8a800",
  slough_fibrinous_exudate:              "#ffe066",
  slough_serous_exudate:                 "#fff0a0",
  infected_tissue_eg_pseudomonas:        "#32cd32",
  purulent_exudate_infected_slough:      "#adff2f",
  hemosiderin_staining_drying_exudate:   "#cd853f",
  serosanguinous_exudate_blood_serum_mix:"#e07040",
  serosanguinous_exudate_dilute:         "#f4a460",
  early_fragile_epithelializing_tissue:  "#ffb6c1",
  fragile_granulation_epithelial_tissue: "#ff69b4",
  hypergranulation_irritated_tissue:     "#ff1493",
  epithelializing_tissue:                "#ffc0cb",
  mixed_devitalized_tissue_slough_eschar:"#8b7355",
};

function normaliseTissueKey(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, "_");
}

function swatchBorder(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#00000022";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r + g + b) / 3 > 180 ? "#00000033" : "transparent";
}

function tissueColor(key: string): string {
  const normalised = normaliseTissueKey(key);
  return TISSUE_COLORS[normalised] ?? TISSUE_COLORS[key] ?? "#999999";
}

export default function WoundDetailScreen() {
  const { woundId } = useLocalSearchParams<{ woundId: string }>();
  const wounds = useWoundsStore((state) => state.wounds);
  const deleteWound = useWoundsStore((state) => state.deleteWound);
  const deleteObservation = useWoundsStore((state) => state.deleteObservation);
  const updateWoundType = useWoundsStore((state) => state.updateWoundType);

  const wound = useMemo(() => wounds.find((item) => item.id === woundId), [woundId, wounds]);
  const trend = wound ? computeAreaTrend(wound) : null;
  const areaHistory = useMemo(() => wound ? getAreaHistory(wound) : [], [wound]);
  const tissueHistory = useMemo(() => wound ? getTissueHistory(wound) : [], [wound]);
  const stats = useMemo(() => wound ? getWoundStats(wound) : null, [wound]);
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);

  if (!wound) {
    return (
      <View style={styles.container}>
        <EmptyState title="Wound not found" description="It may have been deleted." />
      </View>
    );
  }

  const observations = [...wound.observations].sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
  );

  const handleDeleteWound = () => {
    Alert.alert(
      "Delete wound?",
      `"${wound.label}" and all ${observations.length} observation(s) will be permanently deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteWound(wound.id);
            router.replace("/(app)");
          },
        },
      ]
    );
  };

  const handleDeleteObservation = (observationId: string, capturedAt: string) => {
    Alert.alert(
      "Delete observation?",
      `The observation from ${formatLongDateTime(capturedAt)} and its images will be permanently deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteObservation(wound.id, observationId),
        },
      ]
    );
  };

  return (
    <>
      <FlatList
        contentContainerStyle={styles.container}
        data={observations}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerGap}>
            <AppCard>
              <Text style={styles.headerTitle}>{wound.label}</Text>
              {wound.bodyLocation ? (
                <Text style={styles.headerSubtitle}>{wound.bodyLocation}</Text>
              ) : null}
              <View style={styles.headerBadges}>
                <Pressable onPress={() => setShowTypePicker(true)} hitSlop={8}>
                  <WoundTypeBadge label={wound.woundType.topClassKey} />
                </Pressable>
                <Pressable onPress={() => setShowTypePicker(true)} style={styles.editTypeHint}>
                  <Text style={styles.editTypeHintText}>✏️ Edit</Text>
                </Pressable>
                {trend ? (
                  <View style={[styles.trendPill, trend.direction === "up" && styles.trendPillUp]}>
                    <Text style={[styles.trendPillText, trend.direction === "up" && styles.trendPillTextUp]}>
                      {trend.direction === "down" ? "↓" : trend.direction === "up" ? "↑" : "→"}{" "}
                      {Math.abs(trend.deltaCm2).toFixed(2)} cm²
                    </Text>
                  </View>
                ) : null}
              </View>
              {!trend ? (
                <Text style={styles.subtle}>Add at least two measurements to compute area trend.</Text>
              ) : null}
              <AppButton
                label="+ Add Observation"
                onPress={() =>
                  router.push({ pathname: "/(app)/wounds/add-observation", params: { woundId: wound.id } })
                }
              />
            </AppCard>

            {/* ── Size Tracking Summary ───────────────────────────────── */}
            {stats && (stats.firstAreaCm2 != null || stats.latestAreaCm2 != null) ? (
              <AppCard>
                <Text style={styles.sectionTitle}>Size Tracking</Text>
                <View style={styles.statsGrid}>
                  {stats.latestAreaCm2 != null ? (
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>{stats.latestAreaCm2.toFixed(2)}</Text>
                      <Text style={styles.statUnit}>cm² now</Text>
                    </View>
                  ) : null}
                  {stats.firstAreaCm2 != null ? (
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>{stats.firstAreaCm2.toFixed(2)}</Text>
                      <Text style={styles.statUnit}>cm² initial</Text>
                    </View>
                  ) : null}
                  {stats.totalReductionPct != null ? (
                    <View style={styles.statBox}>
                      <Text style={[
                        styles.statValue,
                        { color: stats.totalReductionPct >= 0 ? colors.primary : colors.danger }
                      ]}>
                        {stats.totalReductionPct >= 0 ? "↓ " : "↑ "}
                        {Math.abs(stats.totalReductionPct).toFixed(1)}%
                      </Text>
                      <Text style={styles.statUnit}>total change</Text>
                    </View>
                  ) : null}
                  {stats.daysSinceFirst != null && stats.daysSinceFirst > 0 ? (
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>{stats.daysSinceFirst}</Text>
                      <Text style={styles.statUnit}>days tracked</Text>
                    </View>
                  ) : null}
                </View>

                {/* Area over time sparkline */}
                {areaHistory.length >= 2 ? (
                  <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>Area over time (cm²)</Text>
                    <AreaSparkline points={areaHistory} height={110} showLabels showDots />
                  </View>
                ) : null}
              </AppCard>
            ) : null}

            {/* ── Tissue Composition History ──────────────────────────── */}
            {tissueHistory.length >= 1 ? (
              <AppCard>
                <Text style={styles.sectionTitle}>Tissue Composition History</Text>
                <Text style={styles.chartSubtitle}>
                  {tissueHistory[0]?.isPercentage === false
                    ? "Calibrated tissue areas (cm²) per visit — requires ArUco marker"
                    : "Tissue composition (%) per visit"}
                </Text>
                <TissueHistoryChart snapshots={tissueHistory} />
              </AppCard>
            ) : null}

            {/* Danger zone: delete entire wound */}
            <Pressable style={styles.deleteWoundRow} onPress={handleDeleteWound}>
              <Text style={styles.deleteWoundText}>🗑  Delete this wound</Text>
            </Pressable>

            <Text style={styles.sectionLabel}>Observations ({observations.length})</Text>
          </View>
        }
        renderItem={({ item }) => (
          <AppCard>
            {/* Date + delete row */}
            <View style={styles.obsHeaderRow}>
              <Text style={styles.dateLabel}>{formatLongDateTime(item.capturedAt)}</Text>
              <Pressable
                style={styles.deleteObsBtn}
                onPress={() => handleDeleteObservation(item.id, item.capturedAt)}
                hitSlop={8}
              >
                <Text style={styles.deleteObsBtnText}>🗑</Text>
              </Pressable>
            </View>

            {/* Full-width image — tap to fullscreen */}
            <ImageCompareToggle
              originalUri={item.originalImageUri}
              overlayUri={item.segmentationOverlayUri}
              rectifiedUri={item.rectifiedOverlayUri}
            />

            {/* Metrics chips */}
            <View style={styles.chipsRow}>
              {item.metrics?.totalAreaCm2 !== undefined ? (
                <StatChip label={`${item.metrics.totalAreaCm2.toFixed(2)} cm²`} />
              ) : null}
              {item.metrics?.infectionRiskScore ? (
                <StatChip label={`Risk: ${item.metrics.infectionRiskScore}`} tone="warning" />
              ) : null}
              {item.metrics?.calibration?.marker_size_cm !== undefined ? (
                <StatChip label={`Marker: ${item.metrics.calibration.marker_size_cm} cm`} />
              ) : null}
            </View>

            {/* Tissue size (ArUco) */}
            {item.metrics?.tissueSizeInformation ? (
              <View style={styles.tissueBlock}>
                <Text style={styles.tissueHeader}>Tissue-wise Size (ArUco-calibrated)</Text>
                {(() => {
                  const entries = Object.entries(item.metrics.tissueSizeInformation).sort(
                    (a, b) => b[1].area_cm2 - a[1].area_cm2
                  );
                  const total = entries.reduce((sum, [, info]) => sum + info.area_cm2, 0);
                  return (
                    <>
                      <View style={styles.legendStrip}>
                        {entries.map(([lbl, info]) => {
                          const hex = tissueColor(lbl);
                          const flex = total > 0 ? info.area_cm2 / total : 1 / entries.length;
                          return (
                            <View
                              key={lbl}
                              style={[styles.legendSegment, { flex, backgroundColor: hex, borderColor: swatchBorder(hex) }]}
                            />
                          );
                        })}
                      </View>
                      {entries.map(([lbl, info]) => {
                        const hex = tissueColor(lbl);
                        return (
                          <View key={lbl} style={styles.tissueRow}>
                            <View style={[styles.swatch, { backgroundColor: hex, borderColor: swatchBorder(hex) }]} />
                            <Text style={styles.tissueLabel}>{lbl.replace(/_/g, " ")}</Text>
                            <Text style={styles.tissueValue}>{info.area_cm2.toFixed(3)} cm²</Text>
                            <Text style={styles.tissuePercent}>{info.percentage.toFixed(1)}%</Text>
                          </View>
                        );
                      })}
                    </>
                  );
                })()}
              </View>
            ) : item.metrics?.tissueComposition ? (
              <View style={styles.tissueBlock}>
                <Text style={styles.tissueHeader}>Tissue Composition</Text>
                {Object.entries(item.metrics.tissueComposition)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([lbl, value]) => {
                    const hex = tissueColor(lbl);
                    return (
                      <View key={lbl} style={styles.tissueRow}>
                        <View style={[styles.swatch, { backgroundColor: hex, borderColor: swatchBorder(hex) }]} />
                        <Text style={styles.tissueLabel}>{lbl.replace(/_/g, " ")}</Text>
                        <Text style={styles.tissuePercent}>{value.toFixed(1)}%</Text>
                      </View>
                    );
                  })}
              </View>
            ) : null}

            {/* Notes */}
            {item.notes ? (
              <View style={styles.notesBlock}>
                <Text style={styles.noteLabel}>Notes</Text>
                <Text style={styles.noteText}>{item.notes}</Text>
              </View>
            ) : null}
          </AppCard>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />

      {/* Wound type picker */}
      <WoundTypePickerModal
        visible={showTypePicker}
        currentKey={wound.woundType.topClassKey}
        onSelect={(key) => void updateWoundType(wound.id, key)}
        onClose={() => setShowTypePicker(false)}
      />

      {/* Fullscreen image modal */}
      <Modal visible={!!fullscreenUri} transparent animationType="fade" onRequestClose={() => setFullscreenUri(null)}>
        <View style={styles.modalBg}>
          <Image source={{ uri: fullscreenUri ?? "" }} style={styles.modalImage} resizeMode="contain" />
          <Pressable style={styles.modalClose} onPress={() => setFullscreenUri(null)} hitSlop={12}>
            <Text style={styles.modalCloseText}>✕</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerGap: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
    marginBottom: spacing.md,
  },
  editTypeHint: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  editTypeHintText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  trendPill: {
    backgroundColor: "rgba(15,122,105,0.12)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  trendPillUp: {
    backgroundColor: "rgba(180,35,24,0.1)",
  },
  trendPillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  trendPillTextUp: {
    color: colors.danger,
  },
  deleteWoundRow: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger + "44",
    backgroundColor: colors.danger + "0D",
  },
  deleteWoundText: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: 14,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing.xs,
  },
  obsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  dateLabel: {
    color: colors.textMuted,
    fontSize: 12,
    flex: 1,
  },
  deleteObsBtn: {
    padding: spacing.xs,
  },
  deleteObsBtnText: {
    fontSize: 16,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  tissueBlock: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  tissueHeader: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  legendStrip: {
    flexDirection: "row",
    height: 14,
    borderRadius: 7,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  legendSegment: {
    height: 14,
    borderWidth: 1,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    flexShrink: 0,
  },
  tissueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 4,
  },
  tissueLabel: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    textTransform: "capitalize",
  },
  tissueValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    minWidth: 72,
    textAlign: "right",
  },
  tissuePercent: {
    color: colors.textMuted,
    fontSize: 12,
    minWidth: 44,
    textAlign: "right",
  },
  notesBlock: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  noteLabel: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  noteText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  subtle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    minWidth: 72,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: "center",
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  statUnit: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
  chartSection: {
    marginTop: spacing.sm,
  },
  chartTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  chartSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  // Fullscreen modal
  modalBg: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalClose: {
    position: "absolute",
    top: spacing.xl,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
});
