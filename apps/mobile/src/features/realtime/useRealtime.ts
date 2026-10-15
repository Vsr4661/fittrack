import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";
import { toast } from "@/components/ui";
import { workoutKeys } from "@/features/workouts/hooks";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/authStore";
import { applyLikeCount, refreshAfterReconnect, refreshComments } from "./cacheUpdates";
import { useFeedUpdates } from "./feedUpdates";

/**
 * Owns the live connection for the signed-in part of the app (mounted once in
 * the (app) layout): connected while signed in AND in the foreground, routing
 * every event into the query cache.
 */
export function useRealtime() {
  const queryClient = useQueryClient();
  const signedIn = useAuthStore((s) => s.status === "signedIn");

  useEffect(() => {
    if (!signedIn) return;
    const socket = getSocket();
    let connectedBefore = false;

    const onConnect = () => {
      // The first connect follows a fresh app load; later ones follow a gap
      // (background, network drop) during which events were missed
      if (connectedBefore) refreshAfterReconnect(queryClient);
      connectedBefore = true;
    };
    const onLikes = ({ workoutId, likeCount }: { workoutId: string; likeCount: number }) => applyLikeCount(queryClient, workoutId, likeCount);
    const onComment = ({ workoutId }: { workoutId: string }) => refreshComments(queryClient, workoutId);
    const onHidden = ({ workoutId }: { workoutId: string }) => queryClient.removeQueries({ queryKey: workoutKeys.detail(workoutId) });
    const onNotify = ({ type, actor, workoutTitle }: { type: "like" | "comment"; actor: { displayName: string }; workoutTitle: string }) =>
      toast.info(`${actor.displayName} ${type === "like" ? "liked" : "commented on"} “${workoutTitle}”`);
    const onFeedNew = () => useFeedUpdates.getState().setHasNew(true);

    socket.on("connect", onConnect);
    socket.on("workout:likes", onLikes);
    socket.on("workout:comment", onComment);
    socket.on("workout:comment-deleted", onComment);
    socket.on("workout:hidden", onHidden);
    socket.on("notify", onNotify);
    socket.on("feed:new", onFeedNew);
    connectSocket();

    // Background: drop the socket (iOS suspends it anyway; this saves battery).
    // Foreground: reconnect, and the reconnect refetch catches up on what we missed.
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") connectSocket();
      else if (state === "background") disconnectSocket();
    });

    return () => {
      appState.remove();
      socket.off("connect", onConnect);
      socket.off("workout:likes", onLikes);
      socket.off("workout:comment", onComment);
      socket.off("workout:comment-deleted", onComment);
      socket.off("workout:hidden", onHidden);
      socket.off("notify", onNotify);
      socket.off("feed:new", onFeedNew);
      disconnectSocket(); // signed out (or unmounted): no events for a session that's over
    };
  }, [signedIn, queryClient]);
}
