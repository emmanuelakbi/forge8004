// Feature: nextjs-auth-data-layer, Property 4: resolveRedirectSignInResult Executes At Most Once
// **Validates: Requirements 10.2**

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

const mockGetRedirectResult = vi.fn(() => Promise.resolve(null));

vi.mock("firebase/auth", () => {
  class MockGoogleAuthProvider {
    setCustomParameters = vi.fn();
  }
  return {
    getAuth: vi.fn(() => ({ currentUser: null })),
    GoogleAuthProvider: MockGoogleAuthProvider,
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(),
    getRedirectResult: (...args: unknown[]) => mockGetRedirectResult(...args),
    onAuthStateChanged: vi.fn(() => vi.fn()),
    browserLocalPersistence: {},
    browserSessionPersistence: {},
    inMemoryPersistence: {},
    setPersistence: vi.fn(() => Promise.resolve()),
    browserPopupRedirectResolver: {},
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    updateProfile: vi.fn(),
  };
});

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

describe("Property 4: resolveRedirectSignInResult Executes At Most Once", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetRedirectResult.mockClear();
  });

  it("getRedirectResult is called at most once regardless of call count", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 100 }), async (callCount) => {
        // Reset modules to get a fresh redirectResultResolved flag
        vi.resetModules();
        mockGetRedirectResult.mockClear();
        mockGetRedirectResult.mockResolvedValue(null);

        // Re-import to get a fresh module with reset flag
        const { resolveRedirectSignInResult } =
          await import("@/app/lib/firebase");

        // Call resolveRedirectSignInResult N times sequentially
        for (let i = 0; i < callCount; i++) {
          await resolveRedirectSignInResult();
        }

        // getRedirectResult should be called at most once
        expect(mockGetRedirectResult).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 100 },
    );
  });
});
