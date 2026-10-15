// Mirrors the server's public user shape (publicUserSelect) and auth responses.

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string; // ISO date: JSON has no Date type
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}
