// The signed-in user's own view of their account (includes email).
// Selecting (instead of deleting fields afterwards) means passwordHash can't
// leak by accident when the User model grows new columns.
export const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
} as const;

// What OTHER people may see. No email: that's private contact info.
export const profileSelect = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
} as const;

// Compact author info embedded in feed items and comments.
export const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;
