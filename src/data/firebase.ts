import { initializeApp } from "firebase/app";
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
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

type FirebaseAppletConfig = typeof firebaseConfig & {
  firestoreDatabaseId?: string;
};

const resolvedFirebaseConfig: FirebaseAppletConfig = firebaseConfig;

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Use named database if provided, otherwise fallback to default
// Enable long polling and memory cache to prevent gRPC stream timeout errors in sandboxed environments
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: false,
    localCache: memoryLocalCache(),
  },
  resolvedFirebaseConfig.firestoreDatabaseId || "(default)",
);

export const auth = getAuth(app);

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

const authPersistenceReady = initializeAuthPersistence().catch((err) => {
  console.error("Firebase Auth Persistence Error:", err);
});

export const googleProvider = new GoogleAuthProvider();
// Force select account to avoid silent failures in some browsers
googleProvider.setCustomParameters({ prompt: "select_account" });

let redirectResultResolved = false;
let authTimeoutWarningShown = false;

export async function resolveRedirectSignInResult() {
  await authPersistenceReady;

  if (redirectResultResolved) {
    return null;
  }

  redirectResultResolved = true;

  try {
    return await getRedirectResult(auth);
  } catch (error) {
    console.error("Firebase redirect sign-in resolution failed:", error);
    return null;
  }
}

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

// Error Handling Logic for Firestore
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

// Connection state management
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

// Connection test to verify Firestore configuration
// async function testConnection() {
//   try {
//     await getDocFromServer(doc(db, '_connection_test_', 'ping'));
//     console.log('Firestore connection verified.');
//   } catch (error) {
//     if (error instanceof Error && error.message.includes('the client is offline')) {
//       console.error("Please check your Firebase configuration. The client is offline.");
//     }
//     // Skip logging for other errors (like permission denied on the test doc),
//     // as this is simply a connectivity test.
//   }
// }

// testConnection();

// Firestore connection is initialized lazily.
export {
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  resolvedFirebaseConfig,
  type User,
  browserPopupRedirectResolver,
};
