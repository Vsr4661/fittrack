import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import type { Author } from "@/features/workouts/types";
import { colors, spacing } from "@/theme/legacy";

/** Avatar + name + @username; tapping opens their profile. */
export function AuthorRow({ author, subtitle }: { author: Author; subtitle?: string }) {
  return (
    <Link href={`/user/${author.username}`} asChild>
      <Pressable style={styles.row} accessibilityRole="link" accessibilityLabel={`Open ${author.displayName}'s profile`}>
        <Avatar name={author.displayName} userId={author.id} size={36} />
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>
            {author.displayName}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            @{author.username}
            {subtitle ? ` · ${subtitle}` : ""}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  text: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted },
});
