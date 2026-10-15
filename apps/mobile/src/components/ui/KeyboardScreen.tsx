import { useCallback, useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, View, type StyleProp, type ViewStyle } from "react-native";

/**
 * KeyboardAvoidingView with a measured offset. The offset must equal how far
 * this screen starts from the top of the window (the header height). A
 * hard-coded guess (e.g. 100) is wrong on devices with a different header or
 * status bar, so we measure the real value with the public measureInWindow API.
 *
 * Android: "height" behavior, because Expo apps draw edge-to-edge and the OS
 * no longer resizes the window for the keyboard. (Unverified on a device yet.)
 */
export function KeyboardScreen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<View>(null);
  const [offset, setOffset] = useState(0);

  const measure = useCallback(() => {
    ref.current?.measureInWindow((_x, y) => setOffset(Math.max(0, Math.round(y))));
  }, []);

  return (
    <View ref={ref} onLayout={measure} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={[{ flex: 1 }, style]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={offset}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}
