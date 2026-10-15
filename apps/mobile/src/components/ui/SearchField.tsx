import { Ionicons } from "@expo/vector-icons";
import { Pressable, TextInput, useWindowDimensions, View, type TextInputProps } from "react-native";
import { makeStyles, MIN_TOUCH, textScale, useTheme } from "@/theme";

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
  // Icons don't follow Dynamic Type on their own; scale them with the text (capped)
  const iconSize = Math.round(18 * Math.min(useWindowDimensions().fontScale, textScale.chrome));
  return (
    <View style={styles.field}>
      <Ionicons name="search" size={iconSize} color={colors.textMuted} />
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
          <Ionicons name="close-circle" size={iconSize} color={colors.textMuted} />
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
