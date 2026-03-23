import { useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

type Tab = "original" | "overlay" | "rectified";

type ImageCompareToggleProps = {
  originalUri: string;
  /** Tissue-coloured overlay on the original (perspective-distorted) photo. */
  overlayUri?: string;
  /** Perspective-corrected tissue map (bird's-eye, used for area measurement). */
  rectifiedUri?: string;
};

export function ImageCompareToggle({ originalUri, overlayUri, rectifiedUri }: ImageCompareToggleProps) {
  // Don't initialise from props — props may not be available yet on first render.
  // We resolve the "best" default tab in the activeTab useMemo below.
  const [userTab, setUserTab] = useState<Tab | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);

  // Derive the active tab: honour user's explicit choice, else pick best available.
  const activeTab: Tab = useMemo(() => {
    if (userTab === "rectified" && rectifiedUri) return "rectified";
    if (userTab === "overlay" && overlayUri) return "overlay";
    if (userTab === "original") return "original";
    // No user choice yet — auto-select best available
    if (rectifiedUri) return "rectified";
    if (overlayUri) return "overlay";
    return "original";
  }, [userTab, rectifiedUri, overlayUri]);

  const { width: screenWidth } = useWindowDimensions();

  const activeUri = useMemo(() => {
    if (activeTab === "rectified" && rectifiedUri) return rectifiedUri;
    if (activeTab === "overlay" && overlayUri) return overlayUri;
    return originalUri;
  }, [activeTab, originalUri, overlayUri, rectifiedUri]);

  const containerWidth = screenWidth - spacing.lg * 2 - spacing.lg * 2;
  const displayHeight = useMemo(() => {
    if (!naturalRatio) return undefined;
    const h = containerWidth / naturalRatio;
    return Math.min(Math.max(h, 200), 480);
  }, [naturalRatio, containerWidth]);

  const tabs: { key: Tab; label: string; available: boolean; badge?: string }[] = [
    { key: "original", label: "Original", available: true },
    { key: "overlay", label: "Annotated", available: !!overlayUri },
    { key: "rectified", label: "📐 Rectified", available: !!rectifiedUri },
  ];

  return (
    <View style={styles.container}>
      {/* Image */}
      <Pressable onPress={() => setShowModal(true)} style={styles.imageWrapper}>
        <Image
          source={{ uri: activeUri }}
          style={[
            styles.image,
            displayHeight !== undefined ? { height: displayHeight } : styles.imageFallback,
          ]}
          resizeMode="contain"
          onLoad={(e) => {
            // react-native: dimensions on e.nativeEvent.source
            // react-native-web: dimensions on e.nativeEvent.target (DOM img element)
            const src = (e.nativeEvent as any).source;
            const target = (e.nativeEvent as any).target as HTMLImageElement | undefined;
            const width = src?.width ?? target?.naturalWidth ?? target?.width;
            const height = src?.height ?? target?.naturalHeight ?? target?.height;
            if (width && height) setNaturalRatio(width / height);
          }}
        />
        {/* Active tab label badge */}
        <View style={styles.activeTabBadge} pointerEvents="none">
          {activeTab === "rectified" && rectifiedUri && (
            <Text style={styles.activeTabBadgeText}>📐 Perspective-corrected tissue map</Text>
          )}
          {activeTab === "overlay" && (
            <Text style={styles.activeTabBadgeText}>🎨 Annotated original</Text>
          )}
          {activeTab === "original" && (
            <Text style={styles.activeTabBadgeText}>📷 Original photo</Text>
          )}
        </View>
        <View style={styles.tapHint} pointerEvents="none">
          <Text style={styles.tapHintText}>⛶  Tap to expand</Text>
        </View>
      </Pressable>

      {/* Tab strip */}
      <View style={styles.tabsContainer}>
        <View style={styles.switchRow}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive,
                !tab.available && styles.tabDisabled,
              ]}
              onPress={() => tab.available && setUserTab(tab.key)}
              disabled={!tab.available}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                  !tab.available && styles.tabTextDisabled,
                ]}
              >
                {tab.badge ? `${tab.badge} ` : ""}{tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {activeTab === "rectified" && rectifiedUri && (
          <Text style={styles.rectifiedNote}>
            Perspective-corrected view — used for calibrated area measurements
          </Text>
        )}
      </View>

      {/* Fullscreen modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalBg}>
          <Image
            source={{ uri: activeUri }}
            style={styles.modalImage}
            resizeMode="contain"
          />

          {/* Tab toggle inside modal */}
          <View style={styles.modalTabs}>
            {tabs.filter((t) => t.available).map((tab) => (
              <Pressable
                key={tab.key}
                style={[styles.modalTab, activeTab === tab.key && styles.modalTabActive]}
                onPress={() => setUserTab(tab.key)}
              >
                <Text style={styles.modalTabText}>
                  {tab.badge ? `${tab.badge} ` : ""}{tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.modalClose} onPress={() => setShowModal(false)} hitSlop={12}>
            <Text style={styles.modalCloseText}>✕</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  imageWrapper: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    backgroundColor: "#000000",
  },
  imageFallback: {
    aspectRatio: 3 / 4,
  },
  activeTabBadge: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  activeTabBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  tapHint: {
    position: "absolute",
    bottom: spacing.xs,
    right: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  tapHintText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  tabsContainer: {
    alignItems: "center",
    gap: spacing.xs,
  },
  switchRow: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 999,
    padding: 4,
  },
  tab: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: "transparent",
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabDisabled: {
    opacity: 0.35,
  },
  tabText: {
    color: colors.textMuted,
    fontWeight: "700",
    fontSize: 12,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabTextDisabled: {
    color: colors.textMuted,
  },
  rectifiedNote: {
    color: colors.primary,
    fontSize: 11,
    textAlign: "center",
    fontStyle: "italic",
  },
  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalClose: {
    position: "absolute",
    top: spacing.xl,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  modalTabs: {
    position: "absolute",
    bottom: spacing.xl,
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    padding: 4,
    zIndex: 10,
  },
  modalTab: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "transparent",
  },
  modalTabActive: {
    backgroundColor: colors.primary,
  },
  modalTabText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
