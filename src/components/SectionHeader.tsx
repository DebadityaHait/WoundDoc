import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
