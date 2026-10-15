import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorView, LoadingView } from "@/components/QueryState";
import { useLogout } from "@/features/auth/hooks";
import { WorkoutList } from "@/features/workouts/components/WorkoutList";
import { colors, spacing } from "@/theme/legacy";
import { useProfile, useToggleFollow, useUserWorkouts } from "../hooks";
import type { Profile } from "../types";

/** One screen for both my profile and other people's; `isMe` decides the actions. */
export function ProfileView({ username }: { username: string }) {
  const profile = useProfile(username);
  const workouts = useUserWorkouts(username);

  if (profile.isPending) return <LoadingView />;
  if (profile.isError) return <ErrorView error={profile.error} onRetry={() => profile.refetch()} />;

  const p = profile.data;
  return (
    <WorkoutList
      query={workouts}
      header={<ProfileHeader profile={p} />}
      empty={
        <EmptyState
          title="No workouts yet"
          message={p.isMe ? "Your logged workouts will appear here." : `${p.displayName} hasn't shared any workouts you can see.`}
        />
      }
    />
  );
}

function ProfileHeader({ profile }: { profile: Profile }) {
  return (
    <View style={styles.header}>
      <View style={styles.identity}>
        <Avatar name={profile.displayName} userId={profile.id} size={64} />
        <View style={styles.names}>
          <Text style={styles.name}>{profile.displayName}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
        </View>
      </View>
      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      <View style={styles.counts}>
        <Count label="Workouts" value={profile.counts.workouts} />
        <Count label="Followers" value={profile.counts.followers} />
        <Count label="Following" value={profile.counts.following} />
      </View>

      {profile.isMe ? <MyActions /> : <FollowButton profile={profile} />}
    </View>
  );
}

function FollowButton({ profile }: { profile: Profile }) {
  const toggleFollow = useToggleFollow(profile.username);
  return (
    <Button
      title={profile.isFollowing ? "Following" : "Follow"}
      variant={profile.isFollowing ? "secondary" : "primary"}
      onPress={() => toggleFollow.mutate(!profile.isFollowing)}
    />
  );
}

function MyActions() {
  const logout = useLogout();
  return (
    <View style={styles.actions}>
      <View style={styles.flex}>
        <Button title="Edit profile" variant="secondary" onPress={() => router.push("/edit-profile")} />
      </View>
      <View style={styles.flex}>
        <Button title="Log out" variant="secondary" onPress={() => logout.mutate()} loading={logout.isPending} />
      </View>
    </View>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.count}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, paddingBottom: spacing.sm },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  names: { flex: 1 },
  name: { fontSize: 22, fontWeight: "800", color: colors.text },
  username: { fontSize: 15, color: colors.textMuted },
  bio: { fontSize: 15, color: colors.text, lineHeight: 21 },
  counts: { flexDirection: "row", justifyContent: "space-around" },
  count: { alignItems: "center" },
  countValue: { fontSize: 18, fontWeight: "700", color: colors.text },
  countLabel: { fontSize: 12, color: colors.textMuted },
  actions: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
});
