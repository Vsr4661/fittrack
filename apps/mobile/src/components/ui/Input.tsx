import { Ionicons } from "@expo/vector-icons";
import { useState, type Ref } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { makeStyles, MIN_TOUCH, useTheme } from "@/theme";

interface InputProps extends Omit<TextInputProps, "style"> {
  label: string;
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Adds a show/hide toggle and starts hidden. */
  password?: boolean;
  multilineHeight?: number;
  ref?: Ref<TextInput>; // React 19: ref is a normal prop, no forwardRef needed
}

export function Input({ label, error, hint, icon, password = false, multilineHeight, onFocus, onBlur, ref, ...props }: InputProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(password);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused, Boolean(error) && styles.fieldError]}>
        {icon ? <Ionicons name={icon} size={18} color={focused ? colors.primaryText : colors.textMuted} /> : null}
        <TextInput
          ref={ref}
          {...props}
          secureTextEntry={hidden}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.brand}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multilineHeight ? { minHeight: multilineHeight, textAlignVertical: "top" } : null]}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.messageRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { gap: t.spacing.xs + 2 },
  label: { ...t.typography.label, color: t.colors.text },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
    minHeight: MIN_TOUCH + 6,
    paddingHorizontal: t.spacing.md + 2,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  fieldFocused: { borderColor: t.colors.brand },
  fieldError: { borderColor: t.colors.danger },
  input: { flex: 1, ...t.typography.body, color: t.colors.text, paddingVertical: t.spacing.md },
  toggle: { minWidth: 32, alignItems: "center" },
  messageRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.xs },
  error: { ...t.typography.caption, color: t.colors.danger, flex: 1 },
  hint: { ...t.typography.caption, color: t.colors.textMuted },
}));
