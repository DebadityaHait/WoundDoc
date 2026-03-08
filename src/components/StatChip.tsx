import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

type StatChipProps = {
  label: string;
  tone?: "default" | "warning";
};

export function StatChip({ label, tone = "default" }: StatChipProps) {
  return (
    <View style={[styles.chip, tone === "warning" && styles.warning]}>
      <Text style={[styles.label, tone === "warning" && styles.warningLabel]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  warning: {
    backgroundColor: "#FFF4E5",
    borderColor: "#F1C47B",
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  warningLabel: {
    color: colors.warning,
  },
});
