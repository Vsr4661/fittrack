import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ActionSheet, Card, Photo, toast } from "@/components/ui";
import { pickImages, type ImageSource } from "@/features/uploads/pickImages";
import { prepareImage } from "@/features/uploads/uploadImage";
import { haptics } from "@/lib/haptics";
import { makeStyles, MIN_TOUCH, textScale, useTheme } from "@/theme";
import { MAX_PHOTOS, useWorkoutDraft, type DraftPhoto } from "../draftStore";
import { startPhotoUpload, usePhotoUploads } from "../photoUploads";

const THUMB = 84;

/** The logger's photo row: add from camera or library, see upload progress, retry, remove. */
export function PhotoStrip({ photos }: { photos: DraftPhoto[] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  // The picker can't open while the sheet's Modal is still closing (iOS refuses
  // to present over a dismissing view), so remember the choice and run it
  // once the sheet reports it has fully closed.
  const [pending, setPending] = useState<ImageSource | null>(null);
  const remaining = MAX_PHOTOS - photos.length;

  const pick = async (source: ImageSource) => {
    const assets = await pickImages(source, { limit: remaining });
    // One at a time: decoding several full-size photos at once can exhaust memory
    for (const asset of assets) {
      try {
        const uri = await prepareImage(asset, "WORKOUT_PHOTO");
        const [photo] = useWorkoutDraft.getState().addPhotos([uri]);
        if (photo) void startPhotoUpload(photo);
      } catch {
        toast.error("Couldn't read that photo. Try another one.");
      }
    }
  };

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.title}>Photos</Text>
        <Text style={styles.count} maxFontSizeMultiplier={textScale.chrome}>
          {photos.length}/{MAX_PHOTOS}
        </Text>
      </View>
      <View style={styles.row}>
        {photos.map((photo, i) => (
          <Thumb key={photo.id} photo={photo} index={i} />
        ))}
        {remaining > 0 ? (
          <Pressable
            onPress={() => {
              haptics.tap();
              setSheetOpen(true);
            }}
            style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
            accessibilityRole="button"
            accessibilityLabel="Add photo"
          >
            <Ionicons name="camera-outline" size={26} color={colors.primaryText} />
            <Text style={styles.addLabel} maxFontSizeMultiplier={textScale.chrome}>
              Add
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ActionSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          if (pending) void pick(pending);
          setPending(null);
        }}
        title="Add photo"
        actions={[
          { label: "Take photo", icon: "camera-outline", onPress: () => setPending("camera") },
          { label: "Choose from library", icon: "images-outline", onPress: () => setPending("library") },
        ]}
      />
    </Card>
  );
}

function Thumb({ photo, index }: { photo: DraftPhoto; index: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const status = usePhotoUploads((s) => s.byId[photo.id]);
  const failed = status?.state === "failed";
  const uploading = photo.key === null && !failed;
  const label = `Photo ${index + 1}${uploading ? ", uploading" : failed ? ", upload failed" : ""}`;

  return (
    // Not `accessible` itself: that would group the Remove/Retry buttons out of VoiceOver's reach
    <View style={styles.thumb}>
      <Photo uri={photo.uri} style={styles.thumbImage} accessibilityLabel={label} />
      {uploading || failed ? (
        <Pressable
          style={styles.thumbOverlay}
          disabled={!failed}
          onPress={() => void startPhotoUpload(photo)}
          accessibilityRole="button"
          accessibilityLabel={failed ? `Retry uploading photo ${index + 1}` : undefined}
        >
          {failed ? (
            <Ionicons name="refresh" size={24} color={colors.onScrim} />
          ) : (
            <ActivityIndicator color={colors.onScrim} accessibilityLabel="Uploading" />
          )}
        </Pressable>
      ) : null}
      {status?.state === "uploading" ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(status.progress * 100)}%` }]} />
        </View>
      ) : null}
      <Pressable
        onPress={() => useWorkoutDraft.getState().removePhoto(photo.id)}
        hitSlop={10} // the visible dot is small; the touch area is 44pt
        style={styles.remove}
        accessibilityRole="button"
        accessibilityLabel={`Remove photo ${index + 1}`}
      >
        <Ionicons name="close" size={14} color={colors.onScrim} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  header: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  title: { ...t.typography.heading, color: t.colors.text },
  count: { ...t.typography.label, color: t.colors.textMuted, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.sm },
  thumb: { width: THUMB, height: THUMB },
  thumbImage: { width: THUMB, height: THUMB, borderRadius: t.radius.md },
  thumbOverlay: {
    ...({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const),
    borderRadius: t.radius.md,
    backgroundColor: t.colors.scrim,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    position: "absolute",
    left: t.spacing.sm,
    right: t.spacing.sm,
    bottom: t.spacing.sm,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    overflow: "hidden",
  },
  progressFill: { height: 4, backgroundColor: t.colors.onScrim },
  remove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.colors.scrim,
    borderWidth: 1.5,
    borderColor: t.colors.surface,
  },
  add: {
    width: THUMB,
    height: THUMB,
    minHeight: MIN_TOUCH,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: t.colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.xxs,
  },
  addPressed: { backgroundColor: t.colors.surfaceMuted },
  addLabel: { ...t.typography.label, color: t.colors.primaryText },
}));
