import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Avatar, Badge, EmptyState, ErrorState, SearchField } from "@/components/ui";
import { useUserSearch } from "@/features/social/hooks";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { makeStyles, MIN_TOUCH, useTheme } from "@/theme";

export default function SearchScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const q = useDebouncedValue(text.trim(), 300);
  const search = useUserSearch(q);

  return (
    <View style={styles.screen}>
      <View style={styles.searchBar}>
        <SearchField value={text} onChangeText={setText} placeholder="Search by name or username" accessibilityLabel="Search people" autoFocus />
      </View>

      {search.isError ? (
        <ErrorState error={search.error} onRetry={() => search.refetch()} />
      ) : (
        <FlatList
          data={q ? (search.data ?? []) : []}
          keyExtractor={(u) => u.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          ListHeaderComponent={search.isFetching ? <ActivityIndicator style={styles.spinner} color={colors.textMuted} /> : null}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            !q ? (
              <EmptyState icon="people-outline" title="Find people to follow" message="Search by name or @username to see their workouts in your feed." />
            ) : search.isSuccess && !search.isFetching ? (
              <EmptyState icon="search-outline" title="No one found" message={`Nobody matches "${q}". Check the spelling or try a different name.`} />
            ) : null
          }
          renderItem={({ item }) => (
            // Plain Pressable: <Link asChild> drops a style function (see LeaderboardRow)
            <Pressable
              onPress={() => router.push(`/user/${item.username}`)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel={`${item.displayName}, @${item.username}${item.isFollowing ? ", following" : ""}`}
            >
              <Avatar name={item.displayName} userId={item.id} size={44} />
              <View style={styles.text}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.displayName}
                </Text>
                <Text style={styles.username} numberOfLines={1}>
                  @{item.username}
                </Text>
              </View>
              {item.isFollowing ? <Badge label="Following" icon="checkmark" /> : null}
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  searchBar: { padding: t.spacing.lg, paddingBottom: t.spacing.sm },
  list: { paddingHorizontal: t.spacing.lg, paddingBottom: t.spacing.xxl, flexGrow: 1 },
  spinner: { padding: t.spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: t.spacing.md, minHeight: MIN_TOUCH + 16, paddingVertical: t.spacing.sm, borderRadius: t.radius.md },
  pressed: { opacity: 0.6 },
  text: { flex: 1 },
  name: { ...t.typography.bodyStrong, color: t.colors.text },
  username: { ...t.typography.caption, color: t.colors.textMuted },
  separator: { height: 1, backgroundColor: t.colors.border, marginLeft: 44 + t.spacing.md },
}));
