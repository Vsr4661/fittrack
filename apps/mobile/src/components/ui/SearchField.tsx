import { Ionicons } from "@expo/vector-icons";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";
import { makeStyles, MIN_TOUCH, useTheme } from "@/theme";

interface SearchFieldProps extends Pick<TextInputProps, "autoFocus" | "returnKeyType"> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Screen readers need a name: there is no visible label on a search bar. */
  accessibilityLabel: string;
}

/** Search bar shared by "Find people" and the exercise picker. */
export function SearchField({ value, onChangeText, placeholder, accessibilityLabel, ...props }: SearchFieldProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        {...props}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.brand}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={accessibilityLabel}
      />
      {value.length > 0 ? (
        // Our own clear button (iOS's clearButtonMode doesn't exist on Android)
        <Pressable onPress={() => onChangeText("")} hitSlop={10} style={styles.clear} accessibilityRole="button" accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
    minHeight: MIN_TOUCH,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
  },
  input: { flex: 1, ...t.typography.body, color: t.colors.text, paddingVertical: t.spacing.sm },
  clear: { minWidth: 28, alignItems: "center" },
}));
