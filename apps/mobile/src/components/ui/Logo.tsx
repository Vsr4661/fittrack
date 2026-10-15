import Svg, { G, Rect } from "react-native-svg";

/**
 * The FitTrack mark: a barbell drawn as a rising line (training + tracking).
 * Same geometry as the app icon (scripts/generate-brand-assets.py), so the
 * icon you tap and the logo you land on are one shape. 100-unit viewBox;
 * each part is [center x, width, height] in those units.
 */
const PARTS: [number, number, number][] = [
  [0, 79, 9.2], // the bar
  [-23.9, 12, 46], // inner plates
  [23.9, 12, 46],
  [-36.8, 9.2, 31.3], // outer plates
  [36.8, 9.2, 31.3],
];

export function Logo({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* rotate -20: tilted up to the right, like a rising trend */}
      <G rotation={-20} origin="50, 50">
        {PARTS.map(([cx, w, h], i) => (
          <Rect key={i} x={50 + cx - w / 2} y={50 - h / 2} width={w} height={h} rx={Math.min(w, h) * 0.35} fill={color} />
        ))}
      </G>
    </Svg>
  );
}
