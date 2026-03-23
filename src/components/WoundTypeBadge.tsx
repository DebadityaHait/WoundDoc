import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";
import { WOUND_TYPE_OPTIONS } from "@/src/components/WoundTypePickerModal";

type WoundTypeBadgeProps = {
  label: string;
};

/** Convert a raw key like "arterial_ulcer" → "Arterial Ulcer" as last-resort fallback. */
function prettifyKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Look up the human-readable label from the picker options, or prettify the key. */
function resolveLabel(raw: string): string {
  const match = WOUND_TYPE_OPTIONS.find(
    (o) => o.key === raw || o.key === raw.toLowerCase()
  );
  return match?.label ?? prettifyKey(raw);
}

function resolveTone(label: string) {
  if (/pressure/i.test(label)) return { bg: "#FFE9EC", fg: "#B42340", border: "#F5C2CC" };
  if (/diabetic|venous/i.test(label)) return { bg: "#FFF4E5", fg: "#9A5B00", border: "#F5D7A9" };
  if (/arterial|ischaem/i.test(label)) return { bg: "#FFE9EC", fg: "#7A1B1B", border: "#F5C2CC" };
  if (/surgical/i.test(label)) return { bg: "#E9F8F3", fg: "#1B5E20", border: "#BEE6DB" };
  if (/burn/i.test(label)) return { bg: "#FFF0E5", fg: "#E65100", border: "#FFCC99" };
  if (/infect/i.test(label)) return { bg: "#E9F8F0", fg: "#2e7d32", border: "#BEE6D0" };
  if (/necrot|eschar/i.test(label)) return { bg: "#F0F0F0", fg: "#1a1a1a", border: "#CCCCCC" };
  if (/granulat/i.test(label)) return { bg: "#FFE9EC", fg: "#dc143c", border: "#F5C2CC" };
  if (/slough/i.test(label)) return { bg: "#FFFDE7", fg: "#b8860b", border: "#F5E6A0" };
  if (/epithelial/i.test(label)) return { bg: "#FFF0F5", fg: "#c2185b", border: "#F5C2D8" };
  if (/fibrin/i.test(label)) return { bg: "#F5F5F5", fg: "#888888", border: "#DDDDDD" };
  if (/normal/i.test(label)) return { bg: "#E9F8F3", fg: "#0F7A69", border: "#BEE6DB" };
  if (/unknown|unclass/i.test(label)) return { bg: "#F0F0F0", fg: "#888888", border: "#CCCCCC" };
  return { bg: "#EAF1F5", fg: "#395468", border: "#CDDCE6" };
}

export function WoundTypeBadge({ label }: WoundTypeBadgeProps) {
  const displayLabel = resolveLabel(label);
  const tone = resolveTone(displayLabel);

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={[styles.dot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.text, { color: tone.fg }]}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 13,
    fontWeight: "700",
  },
});
