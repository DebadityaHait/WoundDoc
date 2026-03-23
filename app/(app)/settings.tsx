import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { APP_DISCLAIMERS } from "@/src/constants/disclaimers";
import { useAuthStore } from "@/src/features/auth/auth.store";
import { appConfig } from "@/src/lib/config";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

export default function SettingsScreen() {
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AppCard>
        <Text style={styles.sectionTitle}>Session</Text>
        <AppButton label="Sign out" variant="secondary" onPress={() => void signOut()} />
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>API Runtime URLs</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Classification</Text>
          <Text style={styles.value}>{appConfig.classificationApiBase || "Not configured"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Segmentation</Text>
          <Text style={styles.value}>{appConfig.segmentationApiBase || "Not configured"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Size + Tissue Analysis</Text>
          <Text style={styles.value}>{appConfig.sizeApiBase || appConfig.segmentationApiBase || "Not configured"}</Text>
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>ArUco Marker</Text>
        <Text style={styles.value}>
          Display a physically size-accurate ArUco marker on your screen to use as a calibration reference for wound size measurements.
        </Text>
        <AppButton
          label="📐  Open ArUco Marker Generator"
          variant="secondary"
          onPress={() => router.push("/(app)/aruco-marker")}
        />
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Disclaimer</Text>
        {APP_DISCLAIMERS.map((line) => (
          <Text key={line} style={styles.value}>
            • {line}
          </Text>
        ))}
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Coming Soon</Text>
        <Text style={styles.value}>Supabase integration coming soon.</Text>
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
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  row: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
});
