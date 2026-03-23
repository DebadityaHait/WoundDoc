/**
 * WoundTypePickerModal
 *
 * Full-screen modal that lets the clinician manually select a wound classification
 * if the AI model's prediction is incorrect. The selected type is persisted via
 * useWoundsStore.updateWoundType().
 */
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

export type WoundTypeOption = {
  key: string;
  label: string;
  description: string;
  /** Colour group for the badge dot */
  color: string;
};

/**
 * Canonical list of wound types understood by the classification model.
 * Derived from the Aerobiosys-Wound-Analysis app.py TISSUE_TYPES and standard
 * clinical wound classification.
 */
export const WOUND_TYPE_OPTIONS: WoundTypeOption[] = [
  // ── Primary clinical types ─────────────────────────────────────────────
  {
    key: "pressure_injury",
    label: "Pressure Injury",
    description: "Localised tissue damage from sustained pressure (e.g. sacrum, heel).",
    color: "#B42340",
  },
  {
    key: "diabetic_foot_ulcer",
    label: "Diabetic Foot Ulcer",
    description: "Neuropathic or ischaemic ulcer on the plantar surface in diabetic patients.",
    color: "#9A5B00",
  },
  {
    key: "venous_leg_ulcer",
    label: "Venous Leg Ulcer",
    description: "Chronic ulcer secondary to venous insufficiency, typically on the lower leg.",
    color: "#7B4F00",
  },
  {
    key: "arterial_ulcer",
    label: "Arterial (Ischaemic) Ulcer",
    description: "Ulcer caused by poor arterial perfusion; often punched-out with pale base.",
    color: "#7A1B1B",
  },
  {
    key: "surgical_wound",
    label: "Surgical Wound",
    description: "Post-operative incision or wound dehiscence.",
    color: "#1B5E20",
  },
  {
    key: "traumatic_wound",
    label: "Traumatic Wound",
    description: "Laceration, abrasion, or crush injury from external trauma.",
    color: "#1A237E",
  },
  {
    key: "burn_wound",
    label: "Burn Wound",
    description: "Thermal, chemical, or radiation burn of any degree.",
    color: "#E65100",
  },
  {
    key: "mixed_aetiology_ulcer",
    label: "Mixed Aetiology Ulcer",
    description: "Ulcer with combined arterial and venous components.",
    color: "#4A148C",
  },
  // ── Tissue-state classifications (from size-space model) ──────────────
  {
    key: "necrotic_black",
    label: "Necrotic / Eschar",
    description: "Black or brown dry necrotic tissue (eschar) requiring debridement.",
    color: "#1a1a1a",
  },
  {
    key: "granulation_red",
    label: "Granulating",
    description: "Healthy beefy-red granulation tissue indicating active healing.",
    color: "#dc143c",
  },
  {
    key: "slough_yellow",
    label: "Sloughy",
    description: "Yellow/grey devitalised tissue (slough) in wound bed.",
    color: "#b8860b",
  },
  {
    key: "infected_green",
    label: "Infected",
    description: "Clinical signs of infection — purulent exudate, surrounding erythema.",
    color: "#2e7d32",
  },
  {
    key: "epithelial_pink",
    label: "Epithelialising",
    description: "Pink fragile new epithelium migrating over the wound surface.",
    color: "#c2185b",
  },
  {
    key: "fibrin_white",
    label: "Fibrinous",
    description: "White/cream fibrin layer covering the wound bed.",
    color: "#888888",
  },
  // ── Catch-all ─────────────────────────────────────────────────────────
  {
    key: "unknown",
    label: "Unknown / Unclassified",
    description: "Type could not be determined; clinician review required.",
    color: "#b4b4b4",
  },
];

type Props = {
  visible: boolean;
  currentKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
};

export function WoundTypePickerModal({ visible, currentKey, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Wound Type</Text>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          Override the AI classification if it is incorrect. The change is saved locally and does not affect the model.
        </Text>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {WOUND_TYPE_OPTIONS.map((option) => {
            const isSelected = option.key === currentKey;
            return (
              <Pressable
                key={option.key}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => {
                  onSelect(option.key);
                  onClose();
                }}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.dot, { backgroundColor: option.color }]} />
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                </View>
                {isSelected ? <Text style={styles.checkmark}>✓</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(15,122,105,0.06)",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    flex: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 3,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionDescription: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  checkmark: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 18,
    flexShrink: 0,
  },
});
