import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ActionSheet, Avatar, toast, type SheetAction } from "@/components/ui";
import type { User } from "@/features/auth/types";
import { pickImages, type ImageSource } from "@/features/uploads/pickImages";
import { toApiError } from "@/lib/apiError";
import { haptics } from "@/lib/haptics";
import { makeStyles, textScale, useTheme } from "@/theme";
import { useRemoveAvatar, useSetAvatar } from "../hooks";

const SIZE = 96;

/** The edit-profile header: tap the photo to take, choose or remove one. Saves immediately. */
export function AvatarEditor({ user }: { user: User }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const setAvatar = useSetAvatar();
  const removeAvatar = useRemoveAvatar();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Run after the sheet has fully closed: iOS won't present the picker over a closing modal
  const [pending, setPending] = useState<ImageSource | "remove" | null>(null);
  const busy = setAvatar.isPending || removeAvatar.isPending;

  const onError = (err: unknown) => toast.error(toApiError(err).message);
  const run = async (choice: ImageSource | "remove") => {
    if (choice === "remove") return removeAvatar.mutate(undefined, { onError });
    const [asset] = await pickImages(choice, { square: true });
    if (asset) setAvatar.mutate(asset, { onSuccess: () => toast.success("Profile photo updated"), onError });
  };

  const actions: SheetAction[] = [
    { label: "Take photo", icon: "camera-outline", onPress: () => setPending("camera") },
    { label: "Choose from library", icon: "images-outline", onPress: () => setPending("library") },
    ...(user.avatarUrl ? [{ label: "Remove photo", icon: "trash-outline" as const, destructive: true, onPress: () => setPending("remove") }] : []),
  ];

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => {
          haptics.tap();
          setSheetOpen(true);
        }}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={user.avatarUrl ? "Change profile photo" : "Add profile photo"}
        accessibilityState={{ busy }}
      >
        <Avatar name={user.displayName} userId={user.id} uri={user.avatarUrl} size={SIZE} />
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.onScrim} />
          </View>
        ) : null}
        <View style={styles.badge}>
          <Ionicons name="camera" size={16} color={colors.onPrimary} />
        </View>
      </Pressable>
      <Text style={styles.hint} maxFontSizeMultiplier={textScale.chrome}>
        {user.avatarUrl ? "Change photo" : "Add a photo"}
      </Text>

      <ActionSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          if (pending) void run(pending);
          setPending(null);
        }}
        title="Profile photo"
        actions={actions}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { alignItems: "center", gap: t.spacing.sm, paddingVertical: t.spacing.md },
  busy: {
    ...({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const),
    borderRadius: SIZE / 2,
    backgroundColor: t.colors.scrim,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.colors.primary,
    borderWidth: 2,
    borderColor: t.colors.background,
  },
  hint: { ...t.typography.label, color: t.colors.primaryText },
}));
