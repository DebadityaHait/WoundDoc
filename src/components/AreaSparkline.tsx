/**
 * AreaSparkline
 *
 * A zero-dependency, pure-View area chart showing wound size over time.
 * Uses a polyline drawn as a series of absolutely-positioned line segments
 * via View rotation/translation — no SVG, no canvas, no external libraries.
 *
 * Props:
 *  - points: array of { date: ISO string, areaCm2: number }
 *  - height: chart height in dp (default 80)
 *  - width: chart width in dp (default full container)
 *  - showLabels: show x-axis date labels and y-axis area labels
 *  - showDots: show data point dots
 */
import { useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { colors } from "@/src/theme/colors";
import { radius } from "@/src/theme/radius";
import { spacing } from "@/src/theme/spacing";

export type SparklinePoint = {
  date: string;        // ISO date string
  areaCm2: number;
  label?: string;      // short x-axis label (e.g. "Jan 3")
};

type Props = {
  points: SparklinePoint[];
  height?: number;
  showLabels?: boolean;
  showDots?: boolean;
  color?: string;
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}`;
}

export function AreaSparkline({
  points,
  height = 100,
  showLabels = true,
  showDots = true,
  color = colors.primary,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - spacing.lg * 4; // card padding × 2 sides

  const sorted = useMemo(
    () => [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [points]
  );

  const values = sorted.map((p) => p.areaCm2);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const PAD_TOP = 8;
  const PAD_BOTTOM = showLabels ? 24 : 8;
  const PAD_LEFT = showLabels ? 36 : 8;
  const PAD_RIGHT = 8;
  const plotW = chartWidth - PAD_LEFT - PAD_RIGHT;
  const plotH = height - PAD_TOP - PAD_BOTTOM;

  // Compute (x, y) in dp for each data point
  const pts = useMemo(
    () =>
      sorted.map((p, i) => {
        const x = PAD_LEFT + (sorted.length === 1 ? plotW / 2 : (i / (sorted.length - 1)) * plotW);
        const y = PAD_TOP + plotH - ((p.areaCm2 - minVal) / range) * plotH;
        return { x, y, ...p };
      }),
    [sorted, plotW, plotH, minVal, range, PAD_LEFT, PAD_TOP]
  );

  // Build line segments between consecutive points
  const segments = useMemo(() => {
    const segs: { x: number; y: number; length: number; angle: number; up: boolean }[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const x1 = pts[i].x;
      const y1 = pts[i].y;
      const x2 = pts[i + 1].x;
      const y2 = pts[i + 1].y;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      segs.push({ x: x1, y: y1, length, angle, up: dy < 0 });
    }
    return segs;
  }, [pts]);

  // Trend color: last point vs first
  const trendColor =
    sorted.length < 2
      ? color
      : sorted[sorted.length - 1].areaCm2 < sorted[0].areaCm2
      ? colors.primary   // improving (shrinking)
      : "#B42318";       // worsening (growing)

  if (sorted.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No area data yet</Text>
      </View>
    );
  }

  return (
    <View style={{ width: chartWidth, height }}>
      {/* Y-axis labels */}
      {showLabels && (
        <>
          <Text style={[styles.yLabel, { top: PAD_TOP - 6 }]}>
            {maxVal.toFixed(1)}
          </Text>
          <Text style={[styles.yLabel, { top: PAD_TOP + plotH / 2 - 6 }]}>
            {((maxVal + minVal) / 2).toFixed(1)}
          </Text>
          <Text style={[styles.yLabel, { top: PAD_TOP + plotH - 6 }]}>
            {minVal.toFixed(1)}
          </Text>
        </>
      )}

      {/* Horizontal gridlines */}
      {[0, 0.5, 1].map((f) => (
        <View
          key={f}
          style={[
            styles.gridLine,
            {
              top: PAD_TOP + f * plotH,
              left: PAD_LEFT,
              width: plotW,
            },
          ]}
        />
      ))}

      {/* Fill area (approximated with thin tall rectangles under each segment) */}
      {pts.map((p, i) => {
        if (i === pts.length - 1) return null;
        const next = pts[i + 1];
        const avgY = (p.y + next.y) / 2;
        const fillH = PAD_TOP + plotH - avgY;
        const segW = next.x - p.x;
        return (
          <View
            key={`fill-${i}`}
            style={{
              position: "absolute",
              left: p.x,
              top: avgY,
              width: segW,
              height: Math.max(0, fillH),
              backgroundColor: trendColor,
              opacity: 0.1,
            }}
          />
        );
      })}

      {/* Line segments */}
      {segments.map((seg, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: seg.x,
            top: seg.y,
            width: seg.length,
            height: 2.5,
            backgroundColor: trendColor,
            transformOrigin: "left center",
            transform: [{ rotate: `${seg.angle}deg` }],
          }}
        />
      ))}

      {/* Data point dots */}
      {showDots &&
        pts.map((p, i) => (
          <View
            key={`dot-${i}`}
            style={{
              position: "absolute",
              left: p.x - 5,
              top: p.y - 5,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: trendColor,
              borderWidth: 2,
              borderColor: "#FFFFFF",
              elevation: 2,
            }}
          />
        ))}

      {/* X-axis date labels */}
      {showLabels &&
        pts
          .filter((_, i) => {
            // Show first, last, and at most 3 middle labels
            if (pts.length <= 4) return true;
            return i === 0 || i === pts.length - 1 || i % Math.ceil(pts.length / 3) === 0;
          })
          .map((p, i) => (
            <Text
              key={`xlabel-${i}`}
              style={[
                styles.xLabel,
                {
                  left: p.x - 20,
                  top: PAD_TOP + plotH + 6,
                  width: 40,
                },
              ]}
            >
              {shortDate(p.date)}
            </Text>
          ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  gridLine: {
    position: "absolute",
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  yLabel: {
    position: "absolute",
    left: 0,
    width: 32,
    fontSize: 9,
    color: colors.textMuted,
    textAlign: "right",
  },
  xLabel: {
    position: "absolute",
    fontSize: 9,
    color: colors.textMuted,
    textAlign: "center",
  },
});
