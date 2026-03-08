import { router } from "expo-router";
import { useEffect } from "react";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { EmptyState } from "@/src/components/EmptyState";
import { SectionHeader } from "@/src/components/SectionHeader";
import { WoundTypeBadge } from "@/src/components/WoundTypeBadge";
import { APP_DISCLAIMERS } from "@/src/constants/disclaimers";
import { useAuthStore } from "@/src/features/auth/auth.store";
import { useWoundsStore } from "@/src/features/wounds/wounds.store";
import { formatShortDateTime } from "@/src/lib/date";
import { getLatestAreaCm2, getLatestObservation, getObservationCount } from "@/src/features/wounds/woundSelectors";
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Welcome back</Text>
          <Text style={styles.email}>{session?.email ?? "Local demo user"}</Text>
        </View>
        <Pressable onPress={() => router.push("/(app)/settings")}> 
          <Text style={styles.settingsLink}>Settings</Text>
        </Pressable>
      </View>

      <AppButton label="New Wound" onPress={() => router.push("/(app)/wounds/new")} />

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
                      <WoundTypeBadge label={item.woundType.topClassKey} />
                      <Text style={styles.metaText}>Updated {formatShortDateTime(item.updatedAt)}</Text>
                      <Text style={styles.metaText}>
                        {getObservationCount(item)} observations
                        {latestArea !== null ? ` • ${latestArea.toFixed(2)} cm²` : ""}
                      </Text>
                      {latest?.metrics?.infectionRiskScore ? (
                        <Text style={styles.riskText}>Risk: {latest.metrics.infectionRiskScore}</Text>
                      ) : null}
                    </View>
                  </View>
                </AppCard>
              </Pressable>
            );
          }}
        />
      )}

      <AppCard>
        <Text style={styles.disclaimerTitle}>Clinical safety</Text>
        {APP_DISCLAIMERS.map((line) => (
          <Text key={line} style={styles.disclaimerText}>
            • {line}
          </Text>
        ))}
      </AppCard>
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
  hello: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  email: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  settingsLink: {
    color: colors.primary,
    fontWeight: "700",
  },
  cardRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  thumbnail: {
    width: 84,
    height: 84,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  cardContent: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  riskText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700",
  },
  disclaimerTitle: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  disclaimerText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
