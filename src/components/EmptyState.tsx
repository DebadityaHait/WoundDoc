import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
