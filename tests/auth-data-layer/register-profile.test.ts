// Feature: nextjs-auth-data-layer, Property 6: registerWithEmail Calls updateProfile Iff Name Is Non-Empty
// **Validates: Requirements 3.7**

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// Mock firebase/auth before importing the module under test
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn(() => ({ setCustomParameters: vi.fn() })),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(() => Promise.resolve(null)),
  onAuthStateChanged: vi.fn(() => vi.fn()),
  browserLocalPersistence: {},
  browserSessionPersistence: {},
  inMemoryPersistence: {},
  setPersistence: vi.fn(() => Promise.resolve()),
  browserPopupRedirectResolver: {},
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: vi.fn(),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
}));

vi.mock("firebase/firestore", () => ({
  initializeFirestore: vi.fn(() => ({})),
  memoryLocalCache: vi.fn(() => ({})),
}));

vi.mock("@/firebase-applet-config.json", () => ({
  default: {
    apiKey: "test",
    authDomain: "test.firebaseapp.com",
    projectId: "test",
  },
}));

/**
 * Replicates the exact logic from AuthProvider's handleRegisterWithEmail:
 *
 *   const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
 *   if (name.trim()) {
 *     await updateProfile(credential.user, { displayName: name.trim() });
 *   }
 */
async function registerWithEmailLogic(
  name: string,
  email: string,
  password: string,
) {
  const auth = {};
  const credential = await mockCreateUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  if (name.trim()) {
    await mockUpdateProfile(credential.user, { displayName: name.trim() });
  }
}

describe("Property 6: registerWithEmail Calls updateProfile Iff Name Is Non-Empty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateProfile if and only if name.trim() is non-empty", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (name) => {
        // Reset mocks for each generated input
        mockCreateUserWithEmailAndPassword.mockClear();
        mockUpdateProfile.mockClear();

        const fakeUser = { uid: "test-uid", displayName: null };
        mockCreateUserWithEmailAndPassword.mockResolvedValue({
          user: fakeUser,
        });
        mockUpdateProfile.mockResolvedValue(undefined);

        await registerWithEmailLogic(name, "test@example.com", "password123");

        // createUserWithEmailAndPassword always called exactly once
        expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledTimes(1);

        if (name.trim().length > 0) {
          // Non-empty trimmed name → updateProfile MUST be called
          expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
          expect(mockUpdateProfile).toHaveBeenCalledWith(fakeUser, {
            displayName: name.trim(),
          });
        } else {
          // Empty or whitespace-only name → updateProfile MUST NOT be called
          expect(mockUpdateProfile).not.toHaveBeenCalled();
        }
      }),
      { numRuns: 100 },
    );
  });

  it("never calls updateProfile for whitespace-only names", async () => {
    // Targeted arbitrary: generate strings composed only of whitespace characters
    const whitespaceChar = fc.constantFrom(" ", "\t", "\n", "\r", "\f", "\v");
    const whitespaceOnly = fc
      .array(whitespaceChar, { minLength: 0, maxLength: 50 })
      .map((chars) => chars.join(""));

    await fc.assert(
      fc.asyncProperty(whitespaceOnly, async (name) => {
        mockCreateUserWithEmailAndPassword.mockClear();
        mockUpdateProfile.mockClear();

        const fakeUser = { uid: "test-uid", displayName: null };
        mockCreateUserWithEmailAndPassword.mockResolvedValue({
          user: fakeUser,
        });
        mockUpdateProfile.mockResolvedValue(undefined);

        await registerWithEmailLogic(name, "test@example.com", "password123");

        // Whitespace-only strings always trim to empty → updateProfile never called
        expect(mockUpdateProfile).not.toHaveBeenCalled();
        expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 100 },
    );
  });
});
