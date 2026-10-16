import { useState } from "react";
import { ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Photo } from "@/components/ui";
import { makeStyles, textScale } from "@/theme";
import type { WorkoutPhoto } from "../types";

/** Swipeable full-width photos with a "2 / 3" counter (clearer than dots at a glance). */
export function PhotoGallery({ photos }: { photos: WorkoutPhoto[] }) {
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  if (photos.length === 0) return null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.frame} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {photos.map((p, i) => (
          <Photo key={p.id} uri={p.url} cacheKey={p.key} style={[styles.photo, { width }]} accessibilityLabel={`Workout photo ${i + 1} of ${photos.length}`} />
        ))}
      </ScrollView>
      {photos.length > 1 ? (
        <View style={styles.counter} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Text style={styles.counterText} maxFontSizeMultiplier={textScale.chrome}>
            {page + 1} / {photos.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  frame: { borderRadius: t.radius.lg, overflow: "hidden", backgroundColor: t.colors.surfaceMuted },
  photo: { aspectRatio: 4 / 3 },
  counter: {
    position: "absolute",
    top: t.spacing.md,
    right: t.spacing.md,
    paddingHorizontal: t.spacing.sm + 2,
    paddingVertical: t.spacing.xxs + 1,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.scrim,
  },
  counterText: { ...t.typography.caption, fontFamily: t.typography.label.fontFamily, color: t.colors.onScrim, fontVariant: ["tabular-nums"] },
}));
