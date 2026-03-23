import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

type StatChipProps = {
  label: string;
  tone?: "default" | "warning";
};

export function StatChip({ label, tone = "default" }: StatChipProps) {
  const isDot = tone === "default";
  const dotColor = tone === "default" ? colors.primary : colors.warning;

  return (
    <View style={[styles.chip, tone === "warning" && styles.warning]}>
      <View
        style={[
          styles.dot,
          { backgroundColor: dotColor },
          tone === "warning" && styles.warningDot,
        ]}
      />
      <Text style={[styles.label, tone === "warning" && styles.warningLabel]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.md,
    backgroundColor: "rgba(15, 122, 105, 0.12)",
    borderWidth: 0,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  warning: {
    backgroundColor: "rgba(178, 106, 0, 0.12)",
  },
  warningDot: {
    backgroundColor: colors.warning,
  },
  label: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  warningLabel: {
    color: colors.warning,
  },
});
