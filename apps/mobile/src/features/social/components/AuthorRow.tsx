import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Avatar } from "@/components/ui";
import type { Author } from "@/features/workouts/types";
import { makeStyles } from "@/theme";

/** Avatar + name + @username; tapping opens their profile. */
export function AuthorRow({ author, subtitle }: { author: Author; subtitle?: string }) {
  const styles = useStyles();
  return (
    <Link href={`/user/${author.username}`} asChild>
      <Pressable style={styles.row} accessibilityRole="link" accessibilityLabel={`Open ${author.displayName}'s profile`}>
        <Avatar name={author.displayName} userId={author.id} uri={author.avatarUrl} size={36} />
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

const useStyles = makeStyles((t) => ({
  row: { flexDirection: "row", alignItems: "center", gap: t.spacing.md, minHeight: 44 },
  text: { flex: 1 },
  name: { ...t.typography.bodyStrong, color: t.colors.text },
  sub: { ...t.typography.caption, color: t.colors.textMuted },
}));
