import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Avatar, Button, EmptyState, ErrorState, Skeleton, useCountUp } from "@/components/ui";
import { WorkoutList } from "@/features/workouts/components/WorkoutList";
import { gradients, makeStyles, useTheme } from "@/theme";
import { useProfile, useToggleFollow, useUserWorkouts } from "../hooks";
import type { Profile } from "../types";

const AVATAR_SIZE = 96;

/** One screen for both my profile and other people's; `isMe` decides the actions. */
export function ProfileView({ username }: { username: string }) {
  const profile = useProfile(username);
  const workouts = useUserWorkouts(username);

  if (profile.isPending) return <ProfileSkeleton />;
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />;

  const p = profile.data;
  return (
    <WorkoutList
      query={workouts}
      header={<ProfileHeader profile={p} />}
      empty={
        <EmptyState
          icon={p.isMe ? "barbell-outline" : "eye-off-outline"}
          title="No workouts yet"
          message={p.isMe ? "Your logged workouts will appear here." : `${p.displayName} hasn't shared any workouts you can see.`}
        />
      }
    />
  );
}

function ProfileHeader({ profile }: { profile: Profile }) {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.header}>
      {/* Full-bleed cover: negative margins cancel the list's side padding */}
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover}>
        <View style={styles.blob} />
      </LinearGradient>

      <View style={styles.identity}>
        {/* Ring in the page background color separates the avatar from the cover */}
        <Avatar name={profile.displayName} userId={profile.id} uri={profile.avatarUrl} size={AVATAR_SIZE} ring={colors.background} />
        <Text style={styles.name} accessibilityRole="header">
          {profile.displayName}
        </Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </View>

      <View style={styles.stats}>
        <Stat label="Workouts" value={profile.counts.workouts} />
        <View style={styles.divider} />
        <Stat label="Followers" value={profile.counts.followers} />
        <View style={styles.divider} />
        <Stat label="Following" value={profile.counts.following} />
      </View>

      {profile.isMe ? (
        <Button title="Edit profile" icon="create-outline" variant="secondary" onPress={() => router.push("/edit-profile")} />
      ) : (
        <FollowButton profile={profile} />
      )}

      <Text style={styles.sectionTitle}>Workouts</Text>
    </View>
  );
}

function FollowButton({ profile }: { profile: Profile }) {
  const toggleFollow = useToggleFollow(profile.username);
  // Optimistic (Phase 5): the label flips instantly, then the server confirms
  return profile.isFollowing ? (
    <Button title="Following" icon="checkmark" variant="secondary" onPress={() => toggleFollow.mutate(false)} accessibilityHint="Double tap to unfollow" />
  ) : (
    <Button title="Follow" icon="person-add-outline" onPress={() => toggleFollow.mutate(true)} />
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const styles = useStyles();
  const shown = useCountUp(value);
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={styles.statValue}>{shown}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProfileSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.skeletonScreen} accessibilityLabel="Loading profile" accessibilityRole="progressbar">
      <View style={[styles.cover, styles.skeletonCover]} />
      <View style={styles.identity}>
        <Skeleton circle height={AVATAR_SIZE} />
        <Skeleton width={160} height={22} />
        <Skeleton width={100} height={14} />
      </View>
      <View style={styles.stats}>
        <Skeleton width={60} height={36} />
        <Skeleton width={60} height={36} />
        <Skeleton width={60} height={36} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  header: { gap: t.spacing.lg, marginBottom: t.spacing.sm },
  cover: {
    height: 140,
    marginHorizontal: -t.spacing.lg,
    marginTop: -t.spacing.lg,
    overflow: "hidden",
  },
  blob: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: gradients.heroAccent, opacity: 0.35, top: -70, right: -40 },
  identity: { alignItems: "center", gap: t.spacing.xs, marginTop: -(AVATAR_SIZE / 2) - t.spacing.lg },
  name: { ...t.typography.title, color: t.colors.text, marginTop: t.spacing.sm, textAlign: "center" },
  username: { ...t.typography.body, color: t.colors.textMuted },
  bio: { ...t.typography.body, color: t.colors.text, textAlign: "center", marginTop: t.spacing.xs, maxWidth: 420 },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: t.spacing.md,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.surface,
    ...t.shadows.sm,
    ...(t.scheme === "dark" ? { borderWidth: 1, borderColor: t.colors.border } : null),
  },
  stat: { alignItems: "center", flex: 1 },
  statValue: { ...t.typography.title, color: t.colors.text, fontVariant: ["tabular-nums"] },
  statLabel: { ...t.typography.caption, color: t.colors.textMuted },
  divider: { width: 1, height: 32, backgroundColor: t.colors.border },
  sectionTitle: { ...t.typography.heading, color: t.colors.text, marginTop: t.spacing.sm },
  skeletonScreen: { flex: 1, padding: t.spacing.lg, gap: t.spacing.lg, backgroundColor: t.colors.background },
  skeletonCover: { backgroundColor: t.colors.skeleton },
}));
