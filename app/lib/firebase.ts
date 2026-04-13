"use client";

/**
 * Firebase Client SDK — "use client" boundary.
 * ALL Firebase SDK usage in the Next.js app MUST go through this module.
 * Importing this file from a server component will produce a build error.
 */

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  User,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  setPersistence,
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
} from "firebase/firestore";

import firebaseConfig from "@/firebase-applet-config.json";

type FirebaseAppletConfig = typeof firebaseConfig & {
  firestoreDatabaseId?: string;
};

const resolvedFirebaseConfig: FirebaseAppletConfig = firebaseConfig;

// Firebase SDK handles duplicate initializeApp calls gracefully
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
// Use named database if provided, otherwise fallback to default
// Enable long polling and memory cache to prevent gRPC stream timeout errors in sandboxed environments
// Use getFirestore() fallback if initializeFirestore() was already called
let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: false,
      localCache: memoryLocalCache(),
    },
    resolvedFirebaseConfig.firestoreDatabaseId || "(default)",
  );
} catch {
  db = getFirestore(
    app,
    resolvedFirebaseConfig.firestoreDatabaseId || "(default)",
  );
}
export { db };

export const auth = getAuth(app);

// --- Persistence Chain ---
async function initializeAuthPersistence() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (localError) {
    console.warn(
      "Firebase Auth local persistence unavailable, falling back to session persistence.",
      localError,
    );
    try {
      await setPersistence(auth, browserSessionPersistence);
    } catch (sessionError) {
      console.warn(
        "Firebase Auth session persistence unavailable, falling back to memory persistence.",
        sessionError,
      );
      await setPersistence(auth, inMemoryPersistence);
    }
  }
}

export const authPersistenceReady = initializeAuthPersistence().catch((err) => {
  console.error("Firebase Auth Persistence Error:", err);
});

// --- Google Provider ---
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// --- Redirect Resolution ---
let redirectResultResolved = false;
let authTimeoutWarningShown = false;

export async function resolveRedirectSignInResult() {
  await authPersistenceReady;
  if (redirectResultResolved) return null;
  redirectResultResolved = true;
  try {
    return await getRedirectResult(auth);
  } catch (error) {
    console.error("Firebase redirect sign-in resolution failed:", error);
    return null;
  }
}

// --- Auth State Subscription ---
export function subscribeToAuthState(
  callback: (user: User | null) => void,
  timeoutMs = 4000,
) {
  let settled = false;
  let timeoutId: number | null = null;

  const finalize = (user: User | null) => {
    settled = true;
    if (timeoutId !== null && typeof window !== "undefined") {
      window.clearTimeout(timeoutId);
    }
    callback(user);
  };

  authPersistenceReady.finally(() => {
    if (typeof window !== "undefined") {
      timeoutId = window.setTimeout(() => {
        if (!settled) {
          if (!auth.currentUser && !authTimeoutWarningShown) {
            console.warn(
              "Firebase auth state is slow to initialize locally. Falling back to the current user snapshot.",
            );
            authTimeoutWarningShown = true;
          }
          finalize(auth.currentUser);
        }
      }, timeoutMs);
    }
  });

  const unsubscribe = onAuthStateChanged(
    auth,
    (currentUser) => finalize(currentUser),
    (error) => {
      console.error("Firebase auth observer failed:", error);
      finalize(auth.currentUser);
    },
  );

  return () => {
    if (timeoutId !== null && typeof window !== "undefined") {
      window.clearTimeout(timeoutId);
    }
    unsubscribe();
  };
}

// --- Error Handling ---
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  userId?: string;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    userId: auth.currentUser?.uid,
    operationType,
    path,
  };
  console.error("Firestore Error:", errInfo);
  throw new Error(
    `Firestore ${operationType} failed${path ? ` for ${path}` : ""}.`,
  );
}

// --- Network Connectivity ---
let isOnline = typeof window !== "undefined" ? window.navigator.onLine : true;

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    isOnline = true;
    console.log("Network connection restored.");
  });
  window.addEventListener("offline", () => {
    isOnline = false;
    console.warn(
      "Network connection lost. Firestore will operate in offline mode.",
    );
  });
}

export function getIsOnline() {
  return isOnline;
}

// --- Re-exports for TopBar and AuthProvider ---
export {
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  resolvedFirebaseConfig,
  browserPopupRedirectResolver,
  type User,
};
