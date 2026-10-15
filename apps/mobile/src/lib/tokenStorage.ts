import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "fittrack.refreshToken";

// Only the long-lived refresh token is persisted, in the iOS Keychain /
// Android Keystore. The access token lives in memory only: it's short-lived,
// and keeping it off disk means there's less to steal from a device backup.
export const tokenStorage = {
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),

  setRefreshToken: (token: string) =>
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
      // Readable after the first unlock since boot, so a background task
      // (e.g. handling a push notification) can still refresh the session.
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    }),

  clear: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
};
