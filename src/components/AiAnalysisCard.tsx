/**
 * AiAnalysisCard
 *
 * Displays a Gemini AI clinical analysis result in a structured card.
 * Shows summary, key findings, recommendations, concerns, and healing trajectory.
 * Also renders "Analyse" / "Re-analyse" buttons to trigger analysis on demand.
 */
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/src/components/AppCard";
import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

export type AiAnalysisData = {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  healingTrajectory?: "improving" | "stable" | "worsening" | "insufficient_data";
  concerns: string[];
  generatedAt: string;
  mode: "observation" | "progress_all" | "progress_last_two";
};

type Props = {
  /** Existing analysis to display (null = not yet generated) */
  analysis: AiAnalysisData | null | undefined;
  /** Label for the primary action button */
  analyseLabel?: string;
  /** Called when user taps Analyse / Re-analyse */
  onAnalyse: () => Promise<void>;
  /** Optional second action (e.g. "Compare with previous") */
  secondaryLabel?: string;
  onSecondaryAnalyse?: () => Promise<void>;
  /** Whether to show secondary button */
  showSecondary?: boolean;
};

const TRAJECTORY_CONFIG = {
  improving: { emoji: "📉", label: "Improving", color: colors.primary },
  stable:    { emoji: "➡️", label: "Stable", color: "#B26A00" },
  worsening: { emoji: "📈", label: "Worsening", color: colors.danger },
  insufficient_data: { emoji: "❓", label: "Insufficient data", color: colors.textMuted },
};

function Section({ title, items, tone }: { title: string; items: string[]; tone?: "warning" | "danger" | "primary" }) {
  if (!items.length) return null;
  const textColor =
    tone === "danger" ? colors.danger :
    tone === "warning" ? "#B26A00" :
    tone === "primary" ? colors.primary :
    colors.textMuted;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={[styles.bullet, { color: textColor }]}>•</Text>
          <Text style={[styles.bulletText, { color: tone ? textColor : colors.text }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function AiAnalysisCard({
  analysis,
  analyseLabel = "🤖  Get AI Analysis",
  onAnalyse,
  secondaryLabel,
  onSecondaryAnalyse,
  showSecondary = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyse = async () => {
    setLoading(true);
    setError(null);
    try {
      await onAnalyse();
    } catch (e: any) {
      setError(e?.message ?? "AI analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSecondary = async () => {
    if (!onSecondaryAnalyse) return;
    setSecondaryLoading(true);
    setError(null);
    try {
      await onSecondaryAnalyse();
    } catch (e: any) {
      setError(e?.message ?? "AI analysis failed. Please try again.");
    } finally {
      setSecondaryLoading(false);
    }
  };

  const trajectory = analysis?.healingTrajectory
    ? TRAJECTORY_CONFIG[analysis.healingTrajectory]
    : null;

  const modeLabel =
    analysis?.mode === "progress_all" ? "Progress analysis (all observations)" :
    analysis?.mode === "progress_last_two" ? "Comparison with previous observation" :
    "Single observation analysis";

  return (
    <AppCard>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>🤖  AI Clinical Analysis</Text>
          {analysis ? (
            <Text style={styles.subtitle}>{modeLabel}</Text>
          ) : null}
        </View>
        {trajectory ? (
          <View style={[styles.trajectoryPill, { backgroundColor: trajectory.color + "18", borderColor: trajectory.color + "44" }]}>
            <Text style={[styles.trajectoryText, { color: trajectory.color }]}>
              {trajectory.emoji} {trajectory.label}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Analysis content */}
      {analysis ? (
        <View style={styles.content}>
          {/* Summary */}
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{analysis.summary}</Text>
          </View>

          <Section title="🔍 Key Findings" items={analysis.keyFindings} />
          <Section title="⚠️ Concerns" items={analysis.concerns} tone="warning" />
          <Section title="✅ Recommendations" items={analysis.recommendations} tone="primary" />

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            ⚕️ AI analysis is for informational purposes only. Always review with a qualified clinician.
          </Text>

          {/* Generated at */}
          <Text style={styles.generatedAt}>
            Generated {new Date(analysis.generatedAt).toLocaleString()}
          </Text>
        </View>
      ) : null}

      {/* Error */}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Action buttons */}
      <View style={styles.buttons}>
        <Pressable
          style={[styles.analyseBtn, loading && styles.analyseBtnDisabled]}
          onPress={handleAnalyse}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.analyseBtnText}>
              {analysis ? "🔄  Re-analyse" : analyseLabel}
            </Text>
          )}
        </Pressable>

        {showSecondary && secondaryLabel && onSecondaryAnalyse ? (
          <Pressable
            style={[styles.secondaryBtn, secondaryLoading && styles.analyseBtnDisabled]}
            onPress={handleSecondary}
            disabled={secondaryLoading}
          >
            {secondaryLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.secondaryBtnText}>{secondaryLabel}</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  trajectoryPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    flexShrink: 0,
  },
  trajectoryText: {
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  summaryText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    paddingLeft: spacing.xs,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
    width: 12,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  generatedAt: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: "right",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  buttons: {
    gap: spacing.sm,
  },
  analyseBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  analyseBtnDisabled: {
    opacity: 0.6,
  },
  analyseBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
});
