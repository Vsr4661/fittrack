// The only user fields ever sent to clients. Selecting (instead of deleting
// fields afterwards) means passwordHash can't leak by accident when the
// User model grows new columns.
export const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
} as const;
