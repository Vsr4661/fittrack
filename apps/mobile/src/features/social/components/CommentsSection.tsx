import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { ErrorView } from "@/components/QueryState";
import { toApiError } from "@/lib/apiError";
import { colors, radius, spacing } from "@/theme";
import { useAddComment, useComments, useDeleteComment } from "../hooks";
import type { Comment } from "../types";

interface CommentsSectionProps {
  workoutId: string;
  myUserId: string | undefined;
  workoutOwnerId: string;
}

export function CommentsSection({ workoutId, myUserId, workoutOwnerId }: CommentsSectionProps) {
  const comments = useComments(workoutId);
  const addComment = useAddComment(workoutId);
  const deleteComment = useDeleteComment(workoutId);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    addComment.mutate(body, {
      onSuccess: () => setDraft(""), // only clear on success, so a failed send isn't lost
      onError: (err) => Alert.alert("Couldn't post comment", toApiError(err).message),
    });
  };

  // Mirrors the server rule; the server still enforces it
  const canDelete = (c: Comment) => c.author.id === myUserId || workoutOwnerId === myUserId;

  const confirmDelete = (c: Comment) =>
    Alert.alert("Delete comment?", c.body, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteComment.mutate(c.id, { onError: (err) => Alert.alert("Couldn't delete", toApiError(err).message) }),
      },
    ]);

  const items = comments.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Comments</Text>

      {comments.isError ? <ErrorView error={comments.error} onRetry={() => comments.refetch()} /> : null}
      {comments.isSuccess && items.length === 0 ? <Text style={styles.muted}>No comments yet. Say something nice!</Text> : null}

      {items.map((c) => (
        <Pressable
          key={c.id}
          onLongPress={canDelete(c) ? () => confirmDelete(c) : undefined}
          style={styles.comment}
          accessibilityHint={canDelete(c) ? "Long press to delete" : undefined}
        >
          <Avatar name={c.author.displayName} userId={c.author.id} size={28} />
          <View style={styles.bubble}>
            <Text style={styles.author}>{c.author.displayName}</Text>
            <Text style={styles.body}>{c.body}</Text>
          </View>
        </Pressable>
      ))}

      {comments.hasNextPage ? (
        <Pressable onPress={() => comments.fetchNextPage()} disabled={comments.isFetchingNextPage}>
          <Text style={styles.more}>{comments.isFetchingNextPage ? "Loading…" : "Load more comments"}</Text>
        </Pressable>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a comment…"
          placeholderTextColor={colors.textMuted}
          maxLength={500} // same limit as the server
          multiline
          accessibilityLabel="Add a comment"
        />
        <Pressable
          onPress={submit}
          disabled={!draft.trim() || addComment.isPending}
          accessibilityRole="button"
          accessibilityLabel="Post comment"
        >
          <Text style={[styles.post, (!draft.trim() || addComment.isPending) && styles.postDisabled]}>Post</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  heading: { fontSize: 17, fontWeight: "700", color: colors.text },
  muted: { color: colors.textMuted, fontSize: 14 },
  comment: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  bubble: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm },
  author: { fontSize: 13, fontWeight: "700", color: colors.text },
  body: { fontSize: 15, color: colors.text, marginTop: 2 },
  more: { color: colors.primary, fontWeight: "600", paddingVertical: spacing.sm },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, marginTop: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    color: colors.text,
  },
  post: { color: colors.primary, fontWeight: "700", fontSize: 16, paddingVertical: 10 },
  postDisabled: { opacity: 0.4 },
});
