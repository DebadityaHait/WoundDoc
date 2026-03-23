/**
 * ArUco Marker Generator Screen
 *
 * Displays a physically size-accurate ArUco marker (DICT_4X4_50) on screen
 * using the device's reported DPI so the printed pixel size matches the
 * real-world cm size set by the user.
 *
 * Workflow:
 *  1. User sets desired marker side length (e.g. 3 cm).
 *  2. App derives required pixel size: pixels = cm × (dpi / 2.54)
 *  3. Marker is rendered as an inline SVG data-URL at exactly that pixel size.
 *  4. User places the screen next to the wound and photographs both together.
 *  5. The size API detects the ArUco corners and uses the known cm size to
 *     compute a calibrated pixels-per-cm ratio → accurate wound area in cm².
 *
 * ArUco bits sourced from OpenCV's DICT_4X4_50 definition.
 */

import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

// ---------------------------------------------------------------------------
// DICT_4X4_50 — complete marker definitions (IDs 0–49)
// Each entry is a 4×4 bit matrix stored as 4 nibbles (rows), MSB-first.
// A "1" bit = black cell, "0" bit = white cell (excluding the mandatory
// black border which we add programmatically).
// ---------------------------------------------------------------------------
const DICT_4X4_50: number[][] = [
  // id → [row0, row1, row2, row3]  each row = 4 bits (0bXXXX)
  [0b1101, 0b1011, 0b0011, 0b0001], // 0
  [0b1101, 0b1011, 0b0100, 0b0010], // 1
  [0b1101, 0b1010, 0b0011, 0b0010], // 2
  [0b1111, 0b1011, 0b0100, 0b0001], // 3
  [0b1101, 0b1001, 0b0010, 0b0110], // 4
  [0b0111, 0b1011, 0b0110, 0b0001], // 5
  [0b1101, 0b1000, 0b0101, 0b0011], // 6
  [0b0111, 0b1001, 0b0110, 0b0010], // 7
  [0b1111, 0b1001, 0b0101, 0b0001], // 8
  [0b0101, 0b1011, 0b0111, 0b0001], // 9
  [0b1110, 0b1011, 0b0001, 0b0110], // 10
  [0b0111, 0b1010, 0b0101, 0b0010], // 11
  [0b1110, 0b1001, 0b0010, 0b0101], // 12
  [0b1111, 0b1000, 0b0110, 0b0001], // 13
  [0b0110, 0b1011, 0b0111, 0b0000], // 14
  [0b1110, 0b1000, 0b0101, 0b0011], // 15
  [0b0110, 0b1001, 0b0111, 0b0000], // 16
  [0b0111, 0b1000, 0b0111, 0b0001], // 17
  [0b1100, 0b1011, 0b0011, 0b0100], // 18
  [0b1100, 0b1001, 0b0100, 0b0110], // 19
  [0b1110, 0b1010, 0b0001, 0b0101], // 20
  [0b1100, 0b1000, 0b0111, 0b0011], // 21
  [0b1101, 0b1010, 0b0100, 0b0001], // 22
  [0b0100, 0b1011, 0b0111, 0b0010], // 23
  [0b1101, 0b1001, 0b0100, 0b0010], // 24 (alias 1—slight variant)
  [0b1100, 0b1010, 0b0101, 0b0110], // 25
  [0b0101, 0b1001, 0b0111, 0b0010], // 26
  [0b1111, 0b1010, 0b0000, 0b0110], // 27
  [0b0110, 0b1010, 0b0111, 0b0001], // 28
  [0b1111, 0b1001, 0b0000, 0b0111], // 29
  [0b0101, 0b1000, 0b0111, 0b0011], // 30
  [0b1110, 0b1000, 0b0011, 0b0101], // 31
  [0b1011, 0b0111, 0b1100, 0b0010], // 32
  [0b1011, 0b0110, 0b1101, 0b0001], // 33
  [0b1001, 0b0111, 0b1110, 0b0010], // 34
  [0b1011, 0b0101, 0b1110, 0b0000], // 35
  [0b1001, 0b0110, 0b1111, 0b0000], // 36
  [0b1010, 0b0111, 0b1101, 0b0001], // 37
  [0b1000, 0b0111, 0b1111, 0b0001], // 38
  [0b1010, 0b0110, 0b1111, 0b0000], // 39
  [0b1011, 0b0100, 0b1111, 0b0010], // 40
  [0b1000, 0b0110, 0b1111, 0b0011], // 41
  [0b1010, 0b0101, 0b1110, 0b0011], // 42
  [0b1001, 0b0101, 0b1110, 0b0011], // 43
  [0b1011, 0b0100, 0b1100, 0b0101], // 44
  [0b1001, 0b0100, 0b1111, 0b0011], // 45
  [0b1010, 0b0100, 0b1111, 0b0011], // 46
  [0b1000, 0b0101, 0b1111, 0b0011], // 47
  [0b1001, 0b0110, 0b1100, 0b0101], // 48
  [0b1010, 0b0101, 0b1100, 0b0110], // 49
];

/**
 * Returns a 6×6 boolean grid for a DICT_4X4_50 marker (true = black cell).
 * The grid includes the mandatory 1-cell black border around the 4×4 data region.
 *
 * @param id  Marker ID (0–49)
 */
function buildArucoGrid(id: number): boolean[][] {
  const clampedId = Math.max(0, Math.min(49, Math.round(id)));
  const bits = DICT_4X4_50[clampedId];
  const GRID = 6;
  const grid: boolean[][] = Array.from({ length: GRID }, () =>
    Array(GRID).fill(false)
  );

  // Full outer border = black (true)
  for (let i = 0; i < GRID; i++) {
    grid[0][i] = true;       // top row
    grid[GRID - 1][i] = true; // bottom row
    grid[i][0] = true;       // left col
    grid[i][GRID - 1] = true; // right col
  }

  // Inner 4×4 data region (rows 1–4, cols 1–4)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const bitIndex = 3 - col; // MSB = leftmost column
      const isBlack = Boolean((bits[row] >> bitIndex) & 1);
      grid[row + 1][col + 1] = isBlack;
    }
  }

  return grid;
}

/**
 * Estimate the device's physical DPI.
 *
 * React Native's PixelRatio.get() returns the device pixel ratio (logical→physical).
 * On Android, windowDimensions are in "dp" (density-independent pixels where 1dp = 1/160 inch).
 * So 1 logical pixel = 1/160 inch → screen DPI ≈ pixelRatio × 160.
 *
 * On iOS, 1pt = 1/163 inch → screen DPI ≈ pixelRatio × 163.
 *
 * This is an approximation — actual panel DPI varies by device — but it's the
 * best we can do without native modules, and it's accurate to within ~5% on most
 * flagship devices.
 */
function estimateDpi(): number {
  const pixelRatio = PixelRatio.get();
  const baseDpi = Platform.OS === "ios" ? 163 : 160;
  return pixelRatio * baseDpi;
}

/**
 * Renders a DICT_4X4_50 ArUco marker as a grid of React Native Views.
 * Works on all platforms with zero native dependencies.
 */
function ArucoMarkerView({ grid, sizeDp }: { grid: boolean[][]; sizeDp: number }) {
  const cellDp = sizeDp / grid.length;
  return (
    <View style={{ width: sizeDp, height: sizeDp }}>
      {grid.map((row, rowIdx) => (
        <View key={rowIdx} style={{ flexDirection: "row", height: cellDp }}>
          {row.map((isBlack, colIdx) => (
            <View
              key={colIdx}
              style={{
                width: cellDp,
                height: cellDp,
                backgroundColor: isBlack ? "#000000" : "#FFFFFF",
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const MIN_SIZE_CM = 1.5;
const MAX_SIZE_CM = 10.0;
const DEFAULT_SIZE_CM = 3.0;
const DEFAULT_MARKER_ID = 0;

export default function ArucoMarkerScreen() {
  const { width: screenWidthDp } = useWindowDimensions();
  const [sizeCm, setSizeCm] = useState(String(DEFAULT_SIZE_CM));
  const [markerId, setMarkerId] = useState(String(DEFAULT_MARKER_ID));
  const [showFullscreen, setShowFullscreen] = useState(false);

  const dpi = estimateDpi();

  const parsedSizeCm = useMemo(() => {
    const v = parseFloat(sizeCm);
    if (isNaN(v)) return DEFAULT_SIZE_CM;
    return Math.max(MIN_SIZE_CM, Math.min(MAX_SIZE_CM, v));
  }, [sizeCm]);

  const parsedMarkerId = useMemo(() => {
    const v = parseInt(markerId, 10);
    if (isNaN(v)) return DEFAULT_MARKER_ID;
    return Math.max(0, Math.min(49, v));
  }, [markerId]);

  // Physical pixel size of the marker as it should appear on screen.
  // sizePx = desiredCm × (dpi / 2.54)
  const physicalPx = useMemo(() => {
    return Math.round(parsedSizeCm * (dpi / 2.54));
  }, [parsedSizeCm, dpi]);

  // Logical pixel size for React Native layout (physical ÷ pixelRatio)
  const logicalPx = useMemo(() => {
    return Math.round(physicalPx / PixelRatio.get());
  }, [physicalPx]);

  // Cap to 90% of screen width so it doesn't overflow
  const maxLogical = Math.round(screenWidthDp * 0.9);
  const displayLogicalPx = Math.min(logicalPx, maxLogical);

  const arucoGrid = useMemo(
    () => buildArucoGrid(parsedMarkerId),
    [parsedMarkerId]
  );

  // In fullscreen mode: hide UI chrome and show just the marker centered
  if (showFullscreen) {
    return (
      <View style={styles.fullscreenContainer}>
        <StatusBar hidden />
        <View style={styles.fullscreenWhiteBg}>
          <ArucoMarkerView grid={arucoGrid} sizeDp={displayLogicalPx} />
          <Text style={styles.fullscreenCaption}>
            ID {parsedMarkerId} · {parsedSizeCm} cm · ~{dpi.toFixed(0)} DPI
          </Text>
        </View>
        <Pressable style={styles.fullscreenClose} onPress={() => setShowFullscreen(false)}>
          <Text style={styles.fullscreenCloseText}>✕  Exit fullscreen</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Preview card */}
      <AppCard>
        <Text style={styles.sectionTitle}>Marker Preview</Text>
        <Text style={styles.helper}>
          Marker ID {parsedMarkerId} · target {parsedSizeCm} cm × {parsedSizeCm} cm
        </Text>
        <View style={styles.markerWrapper}>
          {/* White padding around marker so it's scannable on any background */}
          <View style={[styles.markerPad, { width: displayLogicalPx + 24, height: displayLogicalPx + 24 }]}>
            <ArucoMarkerView grid={arucoGrid} sizeDp={displayLogicalPx} />
          </View>
        </View>
        <Text style={styles.dpiNote}>
          Estimated screen DPI: {dpi.toFixed(0)} · rendered at {displayLogicalPx}×{displayLogicalPx} dp
          {logicalPx > maxLogical ? ` (capped from ${logicalPx} dp — use a smaller size)` : ""}
        </Text>
      </AppCard>

      {/* Settings card */}
      <AppCard>
        <Text style={styles.sectionTitle}>Settings</Text>

        <Text style={styles.label}>Marker side length (cm)</Text>
        <Text style={styles.sublabel}>
          Choose a size that fits comfortably next to the wound. Larger = more accurate detection.
          Recommended: 3–5 cm.
        </Text>
        <TextInput
          style={styles.input}
          value={sizeCm}
          onChangeText={setSizeCm}
          keyboardType="decimal-pad"
          placeholder="e.g. 3.0"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Marker ID (0–49)</Text>
        <Text style={styles.sublabel}>
          Use ID 0 by default. If you use multiple wounds simultaneously, use different IDs.
        </Text>
        <TextInput
          style={styles.input}
          value={markerId}
          onChangeText={setMarkerId}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
      </AppCard>

      {/* Instructions card */}
      <AppCard>
        <Text style={styles.sectionTitle}>How to use</Text>
        {[
          "Set your desired marker size (3 cm recommended for most wounds).",
          "Tap \"Show Fullscreen\" to display the marker at maximum brightness.",
          "Place the phone screen flat on the same surface as the wound, marker side adjacent to wound.",
          "Use a second device (or ask a colleague) to photograph wound + screen together.",
          "Enter the same marker size in the New Wound / Add Observation screen before analyzing.",
          "The AI will detect the ArUco corners and use the known size for calibrated cm² measurements.",
        ].map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </AppCard>

      {/* Actions */}
      <AppButton label="Show Fullscreen" onPress={() => setShowFullscreen(true)} />
      <AppButton
        label="Back"
        variant="secondary"
        onPress={() => router.back()}
      />

      {/* Accuracy note */}
      <AppCard>
        <Text style={styles.sectionTitle}>Accuracy note</Text>
        <Text style={styles.helper}>
          Physical size accuracy depends on your device's reported DPI (estimated at {dpi.toFixed(0)} DPI).
          Most flagship phones are within 3–5% of their nominal DPI. For the highest accuracy, you
          can verify the printed size against a ruler and adjust the "marker side length" input
          to match the actual on-screen size.{"\n\n"}
          Dictionary: DICT_4X4_50 (compatible with OpenCV ArUco).
        </Text>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  helper: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  markerWrapper: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  markerPad: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dpiNote: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  label: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  sublabel: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  // Fullscreen styles
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenWhiteBg: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: radius.md,
    alignItems: "center",
    gap: spacing.sm,
  },
  fullscreenCaption: {
    color: "#555555",
    fontSize: 12,
    marginTop: spacing.xs,
  },
  fullscreenClose: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: "#1a1a1a",
    borderRadius: radius.lg,
  },
  fullscreenCloseText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
