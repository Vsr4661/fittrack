import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Avatar, Button, ErrorState, Skeleton } from "@/components/ui";
import { toApiError } from "@/lib/apiError";
import { makeStyles, MIN_TOUCH, useTheme } from "@/theme";
import { useAddComment, useComments, useDeleteComment } from "../hooks";
import type { Comment } from "../types";

interface CommentsSectionProps {
  workoutId: string;
  myUserId: string | undefined;
  workoutOwnerId: string;
}

export function CommentsSection({ workoutId, myUserId, workoutOwnerId }: CommentsSectionProps) {
  const styles = useStyles();
  const { colors } = useTheme();
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
  const canPost = draft.trim().length > 0 && !addComment.isPending;

  return (
    <View style={styles.section}>
      <Text style={styles.heading} accessibilityRole="header">
        Comments{items.length > 0 ? ` · ${items.length}` : ""}
      </Text>

      {comments.isPending ? (
        <View style={styles.comment}>
          <Skeleton circle height={32} />
          <View style={styles.flex}>
            <Skeleton width="30%" height={12} />
            <Skeleton width="80%" height={14} />
          </View>
        </View>
      ) : null}
      {comments.isError ? <ErrorState error={comments.error} onRetry={() => comments.refetch()} /> : null}
      {comments.isSuccess && items.length === 0 ? <Text style={styles.muted}>No comments yet. Say something nice!</Text> : null}

      {items.map((c) => (
        <Pressable
          key={c.id}
          onLongPress={canDelete(c) ? () => confirmDelete(c) : undefined}
          style={styles.comment}
          accessible
          accessibilityLabel={`${c.author.displayName}: ${c.body}`}
          // Long-press is hard to discover with a screen reader: expose the same
          // delete as a named action in the VoiceOver/TalkBack actions menu
          accessibilityActions={canDelete(c) ? [{ name: "delete", label: "Delete comment" }] : undefined}
          onAccessibilityAction={(e) => e.nativeEvent.actionName === "delete" && confirmDelete(c)}
          accessibilityHint={canDelete(c) ? "Long press, or use actions, to delete" : undefined}
        >
          <Avatar name={c.author.displayName} userId={c.author.id} size={32} />
          <View style={styles.bubble}>
            <Text style={styles.author}>{c.author.displayName}</Text>
            <Text style={styles.body}>{c.body}</Text>
          </View>
        </Pressable>
      ))}

      {comments.hasNextPage ? (
        <Button
          title={comments.isFetchingNextPage ? "Loading…" : "Load more comments"}
          variant="ghost"
          loading={comments.isFetchingNextPage}
          onPress={() => comments.fetchNextPage()}
        />
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a comment…"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.brand}
          maxLength={500} // same limit as the server
          multiline
          accessibilityLabel="Add a comment"
        />
        <Pressable
          onPress={submit}
          disabled={!canPost}
          style={[styles.send, canPost ? styles.sendActive : null]}
          accessibilityRole="button"
          accessibilityLabel="Post comment"
          accessibilityState={{ disabled: !canPost, busy: addComment.isPending }}
        >
          <Ionicons name="arrow-up" size={20} color={canPost ? colors.onPrimary : colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: t.spacing.md },
  flex: { flex: 1, gap: t.spacing.xs + 2 },
  heading: { ...t.typography.heading, color: t.colors.text },
  muted: { ...t.typography.body, color: t.colors.textMuted },
  comment: { flexDirection: "row", gap: t.spacing.sm, alignItems: "flex-start" },
  bubble: {
    flex: 1,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    borderTopLeftRadius: t.spacing.xs, // a speech-bubble corner pointing at the avatar
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    ...(t.scheme === "dark" ? { borderWidth: 1, borderColor: t.colors.border } : null),
  },
  author: { ...t.typography.label, color: t.colors.text },
  body: { ...t.typography.body, fontSize: 15, color: t.colors.text, marginTop: t.spacing.xxs },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: t.spacing.sm, marginTop: t.spacing.xs },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH,
    maxHeight: 120,
    borderRadius: t.radius.lg,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    paddingHorizontal: t.spacing.md + 2,
    paddingVertical: t.spacing.sm + 2,
    ...t.typography.body,
    color: t.colors.text,
  },
  send: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  sendActive: { backgroundColor: t.colors.primary },
}));
