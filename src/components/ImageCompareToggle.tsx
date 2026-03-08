import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

type ImageCompareToggleProps = {
  originalUri: string;
  overlayUri?: string;
};

export function ImageCompareToggle({ originalUri, overlayUri }: ImageCompareToggleProps) {
  const [showOverlay, setShowOverlay] = useState(true);

  const activeUri = useMemo(() => {
    if (overlayUri && showOverlay) {
      return overlayUri;
    }
    return originalUri;
  }, [originalUri, overlayUri, showOverlay]);

  return (
    <View style={styles.container}>
      <Image source={{ uri: activeUri }} style={styles.image} />
      <View style={styles.switchRow}>
        <Pressable
          style={[styles.tab, !showOverlay && styles.active]}
          onPress={() => setShowOverlay(false)}
        >
          <Text style={[styles.tabText, !showOverlay && styles.activeText]}>Original</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, showOverlay && styles.active, !overlayUri && styles.disabled]}
          onPress={() => setShowOverlay(true)}
          disabled={!overlayUri}
        >
          <Text style={[styles.tabText, showOverlay && styles.activeText]}>
            {overlayUri ? "Overlay" : "Overlay N/A"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  image: {
    width: "100%",
    height: 250,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  switchRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: "center",
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  active: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  tabText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
  activeText: {
    color: "#FFFFFF",
  },
});
