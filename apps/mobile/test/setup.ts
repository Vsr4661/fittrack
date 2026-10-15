// Runs before each test file.

process.env.EXPO_PUBLIC_API_URL = "http://api.test/api/v1";

// SecureStore is a native module (Keychain/Keystore) that doesn't exist in
// Node, so tests get an in-memory stand-in with the same async API.
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK: 0,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});
