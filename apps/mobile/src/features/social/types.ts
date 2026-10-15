import type { Author } from "@/features/workouts/types";

// Mirrors the server's users.service.ts / social.service.ts responses.

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  counts: { followers: number; following: number; workouts: number };
  isFollowing: boolean;
  isMe: boolean;
}

export interface UserSearchResult extends Author {
  bio: string | null;
  isFollowing: boolean;
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface LikeState {
  likeCount: number;
  likedByMe: boolean;
}
