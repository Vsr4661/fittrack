import { ErrorState, LoadingState } from "@/components/ui";
import { useMe } from "@/features/auth/hooks";
import { ProfileView } from "@/features/social/components/ProfileView";

export default function MyProfileScreen() {
  const me = useMe(); // /me tells us our username; the profile itself comes from /users/:username

  if (me.isPending) return <LoadingState />;
  if (me.isError) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;
  return <ProfileView username={me.data.username} />;
}
