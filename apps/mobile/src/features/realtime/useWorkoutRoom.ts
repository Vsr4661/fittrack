import { router } from "expo-router";
import { useEffect } from "react";
import { toast } from "@/components/ui";
import { getSocket } from "@/lib/socket";

/**
 * Live updates for the workout on screen: watch on mount, unwatch on leave.
 * Rooms don't survive a reconnect, so it watches again on every connect.
 * If the workout becomes invisible to us (made private, deleted), leave the screen.
 */
export function useWorkoutRoom(workoutId: string) {
  useEffect(() => {
    const socket = getSocket();
    const watch = () => socket.emit("workout:watch", workoutId, () => {}); // a refusal just means no live updates
    const onHidden = (e: { workoutId: string }) => {
      if (e.workoutId !== workoutId) return;
      toast.info("This workout is no longer available");
      if (router.canGoBack()) router.back();
    };

    if (socket.connected) watch();
    socket.on("connect", watch);
    socket.on("workout:hidden", onHidden);
    return () => {
      socket.off("connect", watch);
      socket.off("workout:hidden", onHidden);
      if (socket.connected) socket.emit("workout:unwatch", workoutId);
    };
  }, [workoutId]);
}
