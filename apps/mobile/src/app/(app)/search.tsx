import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { ErrorView } from "@/components/QueryState";
import { useUserSearch } from "@/features/social/hooks";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { colors, radius, spacing } from "@/theme/legacy";

export default function SearchScreen() {
  const [text, setText] = useState("");
  const q = useDebouncedValue(text.trim(), 300);
  const search = useUserSearch(q);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Search by name or username"
        placeholderTextColor={colors.textMuted}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        accessibilityLabel="Search people"
      />

      {search.isError ? (
        <ErrorView error={search.error} onRetry={() => search.refetch()} />
      ) : (
        <FlatList
          data={q ? (search.data ?? []) : []}
          keyExtractor={(u) => u.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={search.isFetching ? <ActivityIndicator style={styles.spinner} /> : null}
          ListEmptyComponent={
            q && search.isSuccess && !search.isFetching ? <Text style={styles.empty}>No one found for "{q}"</Text> : null
          }
          renderItem={({ item }) => (
            <Link href={`/user/${item.username}`} asChild>
              <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityRole="link">
                <Avatar name={item.displayName} userId={item.id} />
                <View style={styles.text}>
                  <Text style={styles.name}>{item.displayName}</Text>
                  <Text style={styles.username}>@{item.username}</Text>
                </View>
                {item.isFollowing ? <Text style={styles.badge}>Following</Text> : null}
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  input: {
    margin: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  spinner: { padding: spacing.sm },
  empty: { textAlign: "center", color: colors.textMuted, padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  pressed: { backgroundColor: colors.surface },
  text: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  username: { fontSize: 14, color: colors.textMuted },
  badge: { fontSize: 13, color: colors.textMuted },
});
