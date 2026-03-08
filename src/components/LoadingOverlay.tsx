import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

type LoadingOverlayProps = {
  visible: boolean;
  message?: string;
};

export function LoadingOverlay({ visible, message = "Loading..." }: LoadingOverlayProps) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 16, 20, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  message: {
    color: colors.text,
    fontWeight: "600",
  },
});
