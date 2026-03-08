import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

type WoundTypeBadgeProps = {
  label: string;
};

function resolveTone(label: string) {
  if (/pressure/i.test(label)) {
    return { bg: "#FFE9EC", fg: "#B42340", border: "#F5C2CC" };
  }
  if (/diabetic|venous/i.test(label)) {
    return { bg: "#FFF4E5", fg: "#9A5B00", border: "#F5D7A9" };
  }
  if (/normal/i.test(label)) {
    return { bg: "#E9F8F3", fg: "#0F7A69", border: "#BEE6DB" };
  }
  return { bg: "#EAF1F5", fg: "#395468", border: "#CDDCE6" };
}

export function WoundTypeBadge({ label }: WoundTypeBadgeProps) {
  const tone = resolveTone(label);

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Text style={[styles.text, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
});
