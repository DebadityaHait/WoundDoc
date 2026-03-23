import { router } from "expo-router";
import { useEffect } from "react";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { EmptyState } from "@/src/components/EmptyState";
import { SectionHeader } from "@/src/components/SectionHeader";
import { WoundTypeBadge } from "@/src/components/WoundTypeBadge";
import { useAuthStore } from "@/src/features/auth/auth.store";
import { useWoundsStore } from "@/src/features/wounds/wounds.store";
import { formatShortDateTime } from "@/src/lib/date";
import { getLatestAreaCm2, getLatestObservation, getObservationCount, getAreaHistory, getWoundStats, computeAreaTrend } from "@/src/features/wounds/woundSelectors";
import { AreaSparkline } from "@/src/components/AreaSparkline";
import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

export default function DashboardScreen() {
  const session = useAuthStore((state) => state.session);
  const wounds = useWoundsStore((state) => state.wounds);
  const isHydrating = useWoundsStore((state) => state.isHydrating);
  const hydrate = useWoundsStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Extract first letter from email for avatar
  const getAvatarInitial = (): string => {
    if (!session?.email) return "D";
    return session.email.charAt(0).toUpperCase();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AppCard>
        <View style={styles.headerRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getAvatarInitial()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.hello}>Welcome back</Text>
            <Text style={styles.email}>{session?.email ?? "Local demo user"}</Text>
          </View>
          <Pressable onPress={() => router.push("/(app)/settings")}> 
            <Text style={styles.settingsLink}>⚙️</Text>
          </Pressable>
        </View>
      </AppCard>

      <AppButton label="+ New Wound" onPress={() => router.push("/(app)/wounds/new")} />

      <SectionHeader title="Your Wounds" subtitle="Timeline-first monitoring" />

      {wounds.length === 0 ? (
        <EmptyState
          title={isHydrating ? "Loading wounds" : "No wounds yet"}
          description="Start by adding the first wound image to initialize classification and segmentation."
        />
      ) : (
        <FlatList
          data={wounds}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => {
            const latest = getLatestObservation(item);
            const latestArea = getLatestAreaCm2(item);
            const areaHistory = getAreaHistory(item);
            const stats = getWoundStats(item);
            const trend = computeAreaTrend(item);
            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(app)/wounds/[woundId]",
                    params: { woundId: item.id },
                  })
                }
              >
                <AppCard>
                  <View style={styles.cardRow}>
                    <Image source={{ uri: item.coverImageUri }} style={styles.thumbnail} />
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{item.label}</Text>
                      <View style={styles.badgeRow}>
                        <WoundTypeBadge label={item.woundType.topClassKey} />
                        {latest?.metrics?.infectionRiskScore ? (
                          <View style={styles.riskChip}>
                            <Text style={styles.riskChipText}>Risk: {latest.metrics.infectionRiskScore}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.statsRow}>
                        <Text style={styles.metaText}>{getObservationCount(item)} obs</Text>
                        {latestArea !== null ? (
                          <Text style={styles.metaText}>• {latestArea.toFixed(2)} cm²</Text>
                        ) : null}
                        {trend && stats?.totalReductionPct != null ? (
                          <Text style={[
                            styles.metaText,
                            { color: trend.direction === "down" ? colors.primary : colors.danger, fontWeight: "700" }
                          ]}>
                            {trend.direction === "down" ? "↓" : trend.direction === "up" ? "↑" : "→"}
                            {" "}{Math.abs(stats.totalReductionPct).toFixed(1)}%
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.metaText}>Updated {formatShortDateTime(item.updatedAt)}</Text>
                    </View>
                  </View>

                  {/* Mini sparkline — only shown when 2+ area readings exist */}
                  {areaHistory.length >= 2 ? (
                    <View style={styles.sparklineWrapper}>
                      <AreaSparkline
                        points={areaHistory}
                        height={48}
                        showLabels={false}
                        showDots={false}
                      />
                    </View>
                  ) : null}
                </AppCard>
              </Pressable>
            );
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  hello: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  email: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  settingsLink: {
    fontSize: 24,
  },
  cardRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  thumbnail: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  riskChip: {
    backgroundColor: "#FFF4E6",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  riskChipText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "600",
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  sparklineWrapper: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: "hidden",
  },
});
