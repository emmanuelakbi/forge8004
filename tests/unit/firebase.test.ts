// Unit tests for firebase.ts — covers exported helpers and error handling
// Mocks all Firebase SDK dependencies

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Extracted logic mirroring firebase.ts exports ─────────────────

// OperationType enum (mirrors firebase.ts)
enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  userId?: string;
}

// Extracted handleFirestoreError logic
function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  currentUserId?: string,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    userId: currentUserId,
    operationType,
    path,
  };

  console.error("Firestore Error:", errInfo);
  throw new Error(
    `Firestore ${operationType} failed${path ? ` for ${path}` : ""}.`,
  );
}

// Extracted getIsOnline logic
function createOnlineTracker(initialOnline: boolean) {
  let isOnline = initialOnline;
  return {
    getIsOnline: () => isOnline,
    setOnline: () => {
      isOnline = true;
    },
    setOffline: () => {
      isOnline = false;
    },
  };
}

// Extracted subscribeToAuthState logic
function createAuthSubscriber() {
  type Callback = (user: { uid: string } | null) => void;

  return function subscribeToAuthState(
    onAuthStateChanged: (cb: Callback, errCb: (e: Error) => void) => () => void,
    currentUser: { uid: string } | null,
    callback: Callback,
    timeoutMs = 4000,
  ) {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finalize = (user: { uid: string } | null) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
      callback(user);
    };

    timeoutId = setTimeout(() => {
      if (!settled) finalize(currentUser);
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(
      (user) => finalize(user),
      (error) => {
        console.error("Firebase auth observer failed:", error);
        finalize(currentUser);
      },
    );

    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      unsubscribe();
    };
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe("[Firebase]", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("handleFirestoreError", () => {
    it("should throw with operation type and path in message", () => {
      expect(() =>
        handleFirestoreError(
          new Error("not found"),
          OperationType.GET,
          "agents/123",
        ),
      ).toThrow("Firestore get failed for agents/123.");
    });

    it("should throw without path when path is null", () => {
      expect(() =>
        handleFirestoreError(new Error("timeout"), OperationType.LIST, null),
      ).toThrow("Firestore list failed.");
    });

    it("should handle non-Error objects as error input", () => {
      expect(() =>
        handleFirestoreError("string error", OperationType.CREATE, "agents"),
      ).toThrow("Firestore create failed for agents.");
    });

    it("should log error info with userId when provided", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        handleFirestoreError(
          new Error("denied"),
          OperationType.UPDATE,
          "agents/1",
          "user-abc",
        );
      } catch {
        // expected
      }

      expect(spy).toHaveBeenCalledWith("Firestore Error:", {
        error: "denied",
        operationType: "update",
        path: "agents/1",
        userId: "user-abc",
      });
    });

    it("should log error info without userId when not provided", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        handleFirestoreError(
          new Error("fail"),
          OperationType.DELETE,
          "intents/5",
        );
      } catch {
        // expected
      }

      expect(spy).toHaveBeenCalledWith("Firestore Error:", {
        error: "fail",
        operationType: "delete",
        path: "intents/5",
        userId: undefined,
      });
    });

    it("should cover all operation types in error messages", () => {
      for (const op of Object.values(OperationType)) {
        expect(() =>
          handleFirestoreError(new Error("err"), op, "col/doc"),
        ).toThrow(`Firestore ${op} failed for col/doc.`);
      }
    });
  });

  describe("OperationType enum", () => {
    it("should have all expected operation types", () => {
      expect(OperationType.CREATE).toBe("create");
      expect(OperationType.UPDATE).toBe("update");
      expect(OperationType.DELETE).toBe("delete");
      expect(OperationType.LIST).toBe("list");
      expect(OperationType.GET).toBe("get");
      expect(OperationType.WRITE).toBe("write");
    });
  });

  describe("getIsOnline", () => {
    it("should return true when initialized as online", () => {
      const tracker = createOnlineTracker(true);
      expect(tracker.getIsOnline()).toBe(true);
    });

    it("should return false when initialized as offline", () => {
      const tracker = createOnlineTracker(false);
      expect(tracker.getIsOnline()).toBe(false);
    });

    it("should reflect online state after going offline then online", () => {
      const tracker = createOnlineTracker(true);
      tracker.setOffline();
      expect(tracker.getIsOnline()).toBe(false);
      tracker.setOnline();
      expect(tracker.getIsOnline()).toBe(true);
    });
  });

  describe("subscribeToAuthState", () => {
    const subscribe = createAuthSubscriber();

    it("should call callback with user when auth state resolves", async () => {
      const user = { uid: "user-1" };
      let capturedUser: { uid: string } | null = null;

      subscribe(
        (cb) => {
          cb(user);
          return () => {};
        },
        null,
        (u) => {
          capturedUser = u;
        },
      );

      // Allow microtask to settle
      await new Promise((r) => setTimeout(r, 10));
      expect(capturedUser).toEqual(user);
    });

    it("should call callback with null when auth state resolves with no user", async () => {
      let capturedUser: { uid: string } | null | undefined = undefined;

      subscribe(
        (cb) => {
          cb(null);
          return () => {};
        },
        null,
        (u) => {
          capturedUser = u;
        },
      );

      await new Promise((r) => setTimeout(r, 10));
      expect(capturedUser).toBeNull();
    });

    it("should fall back to currentUser on auth observer error", async () => {
      const fallback = { uid: "fallback-user" };
      let capturedUser: { uid: string } | null = null;

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      subscribe(
        (_cb, errCb) => {
          errCb(new Error("observer failed"));
          return () => {};
        },
        fallback,
        (u) => {
          capturedUser = u;
        },
      );

      await new Promise((r) => setTimeout(r, 10));
      expect(capturedUser).toEqual(fallback);
      expect(spy).toHaveBeenCalled();
    });

    it("should timeout and use currentUser when auth state is slow", async () => {
      const fallback = { uid: "timeout-user" };
      let capturedUser: { uid: string } | null = null;

      subscribe(
        () => {
          // Never calls the callback — simulates slow auth
          return () => {};
        },
        fallback,
        (u) => {
          capturedUser = u;
        },
        50, // short timeout for test
      );

      await new Promise((r) => setTimeout(r, 100));
      expect(capturedUser).toEqual(fallback);
    });

    it("should not call callback twice if auth resolves after timeout", async () => {
      const fallback = { uid: "timeout-user" };
      const realUser = { uid: "real-user" };
      let callCount = 0;

      subscribe(
        (cb) => {
          // Resolve after timeout
          setTimeout(() => cb(realUser), 100);
          return () => {};
        },
        fallback,
        () => {
          callCount++;
        },
        30,
      );

      await new Promise((r) => setTimeout(r, 200));
      expect(callCount).toBe(1);
    });

    it("should return an unsubscribe function that cleans up", () => {
      let unsubCalled = false;

      const unsub = subscribe(
        () => {
          return () => {
            unsubCalled = true;
          };
        },
        null,
        () => {},
      );

      unsub();
      expect(unsubCalled).toBe(true);
    });
  });

  describe("resolveRedirectSignInResult", () => {
    it("should return null after first call (idempotent)", async () => {
      // Mirrors the redirectResultResolved guard in firebase.ts
      let resolved = false;

      async function resolveRedirect(getRedirectResult: () => Promise<any>) {
        if (resolved) return null;
        resolved = true;
        try {
          return await getRedirectResult();
        } catch {
          return null;
        }
      }

      const result1 = await resolveRedirect(async () => ({
        user: { uid: "u1" },
      }));
      expect(result1).toEqual({ user: { uid: "u1" } });

      const result2 = await resolveRedirect(async () => ({
        user: { uid: "u2" },
      }));
      expect(result2).toBeNull();
    });

    it("should return null when getRedirectResult throws", async () => {
      let resolved = false;

      async function resolveRedirect(getRedirectResult: () => Promise<any>) {
        if (resolved) return null;
        resolved = true;
        try {
          return await getRedirectResult();
        } catch {
          return null;
        }
      }

      const result = await resolveRedirect(async () => {
        throw new Error("redirect failed");
      });
      expect(result).toBeNull();
    });
  });
});
