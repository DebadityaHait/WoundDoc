import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
};

export function AppButton({ label, onPress, variant = "primary", loading = false, disabled = false }: AppButtonProps) {
  const isDisabled = loading || disabled;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? colors.text : "#FFFFFF"} />
      ) : (
        <Text style={[styles.label, variant === "secondary" && styles.secondaryLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.65,
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryLabel: {
    color: colors.text,
  },
});
