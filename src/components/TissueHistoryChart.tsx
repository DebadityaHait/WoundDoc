/**
 * TissueHistoryChart
 *
 * Stacked horizontal bar chart showing tissue composition % across observations.
 * Each row = one observation (sorted oldest → newest).
 * Each bar segment = one tissue type, coloured using the same TISSUE_COLORS map.
 *
 * Zero external dependencies — pure React Native Views.
 */
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

// ── Tissue color map (same as [woundId].tsx) ─────────────────────────────────
const TISSUE_COLORS: Record<string, string> = {
  necrotic_black:                        "#1a1a1a",
  devitalized_brown:                     "#996633",
  granulation_red:                       "#dc143c",
  slough_yellow:                         "#ffd700",
  infected_green:                        "#32cd32",
  bruising_purple:                       "#8a2be2",
  epithelial_pink:                       "#ff69b4",
  fibrin_white:                          "#f5f5f5",
  unclassified_other:                    "#b4b4b4",
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

function normKey(k: string): string {
  return k.toLowerCase().trim().replace(/\s+/g, "_");
}

function getTissueColor(key: string): string {
  return TISSUE_COLORS[normKey(key)] ?? TISSUE_COLORS[key] ?? "#999999";
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}`;
}

export type TissueSnapshot = {
  date: string;
  /** tissue key → percentage (0-100) OR area cm² */
  tissue: Record<string, number>;
  /** If true, values are percentages; if false, values are cm² */
  isPercentage: boolean;
  totalAreaCm2?: number;
};

type Props = {
  snapshots: TissueSnapshot[];
};

export function TissueHistoryChart({ snapshots }: Props) {
  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [snapshots]
  );

  // Collect all tissue keys seen across all snapshots
  const allKeys = useMemo(() => {
    const seen = new Set<string>();
    sorted.forEach((s) => Object.keys(s.tissue).forEach((k) => seen.add(k)));
    // Sort by average value descending for consistent ordering
    return [...seen].sort((a, b) => {
      const avgA = sorted.reduce((sum, s) => sum + (s.tissue[a] ?? 0), 0) / sorted.length;
      const avgB = sorted.reduce((sum, s) => sum + (s.tissue[b] ?? 0), 0) / sorted.length;
      return avgB - avgA;
    });
  }, [sorted]);

  if (sorted.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No tissue data yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {sorted.map((snap, rowIdx) => {
        const total = Object.values(snap.tissue).reduce((s, v) => s + v, 0);
        const entries = allKeys
          .filter((k) => (snap.tissue[k] ?? 0) > 0)
          .map((k) => ({ key: k, value: snap.tissue[k] ?? 0 }));

        return (
          <View key={rowIdx} style={styles.row}>
            {/* Date label */}
            <Text style={styles.rowDate}>{shortDate(snap.date)}</Text>

            {/* Stacked bar */}
            <View style={styles.barTrack}>
              {entries.map(({ key, value }) => {
                const pct = total > 0 ? (value / total) * 100 : 0;
                const hex = getTissueColor(key);
                return (
                  <View
                    key={key}
                    style={[
                      styles.barSegment,
                      { flex: pct, backgroundColor: hex },
                    ]}
                  />
                );
              })}
            </View>

            {/* Area label */}
            {snap.totalAreaCm2 !== undefined ? (
              <Text style={styles.areaLabel}>{snap.totalAreaCm2.toFixed(1)} cm²</Text>
            ) : null}
          </View>
        );
      })}

      {/* Legend */}
      <View style={styles.legend}>
        {allKeys.map((key) => {
          const hex = getTissueColor(key);
          const border =
            parseInt(hex.replace("#", "").slice(0, 2), 16) +
              parseInt(hex.replace("#", "").slice(2, 4), 16) +
              parseInt(hex.replace("#", "").slice(4, 6), 16) >
            540
              ? "#00000033"
              : "transparent";
          return (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: hex, borderColor: border, borderWidth: 1 }]} />
              <Text style={styles.legendLabel}>{key.replace(/_/g, " ")}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  empty: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowDate: {
    width: 44,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "right",
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: 20,
    borderRadius: 10,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: colors.surface,
  },
  barSegment: {
    height: 20,
  },
  areaLabel: {
    width: 52,
    fontSize: 10,
    color: colors.text,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 0,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
});
