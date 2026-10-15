import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, type BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "@/lib/haptics";
import { makeStyles, MIN_TOUCH, useTheme } from "@/theme";

export interface SheetAction {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
}

/**
 * A bottom sheet of actions ("Delete workout", "Share"...), controlled with a
 * plain `open` boolean. Sheets beat centered alerts on big phones: the options
 * sit under your thumb, and you can swipe them away.
 *
 * Why a gorhom BottomSheet inside an RN <Modal> (not BottomSheetModal): the
 * portal-based BottomSheetModal opened but rendered invisibly with this
 * Expo Router / native-stack setup (verified: it reported index 0 while nothing
 * showed). A native Modal is always on top of every screen and header.
 */
export function ActionSheet({ open, onClose, title, actions }: ActionSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const [visible, setVisible] = useState(open);
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (open) setVisible(true);
    else sheetRef.current?.close(); // animate down; onClose below then hides the Modal
  }, [open]);

  const handleClosed = useCallback(() => {
    setVisible(false);
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  );

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => sheetRef.current?.close()}>
      {/* A native Modal is a separate root view, so gestures need their own root */}
      <GestureHandlerRootView style={styles.root}>
        <BottomSheet
          ref={sheetRef}
          index={0}
          enableDynamicSizing // height fits the content
          enablePanDownToClose
          onClose={handleClosed} // swipe-down, backdrop tap and Android back all end here
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.background}
          handleIndicatorStyle={styles.handle}
        >
          <BottomSheetView style={[styles.content, { paddingBottom: insets.bottom + 12 }]}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => {
                  haptics.tap();
                  sheetRef.current?.close();
                  action.onPress();
                }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Ionicons name={action.icon} size={22} color={action.destructive ? colors.danger : colors.text} />
                <Text style={[styles.label, action.destructive && { color: colors.danger }]}>{action.label}</Text>
              </Pressable>
            ))}
          </BottomSheetView>
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1 },
  background: { backgroundColor: t.colors.surface },
  handle: { backgroundColor: t.colors.border, width: 40 },
  content: { paddingHorizontal: t.spacing.sm },
  title: { ...t.typography.overline, color: t.colors.textMuted, paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.lg,
    minHeight: MIN_TOUCH + 8,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.md,
  },
  pressed: { backgroundColor: t.colors.surfaceMuted },
  label: { ...t.typography.bodyStrong, color: t.colors.text },
}));
