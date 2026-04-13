"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  auth,
  googleProvider,
  subscribeToAuthState,
  resolveRedirectSignInResult,
  signInWithPopup,
  signInWithRedirect,
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type User,
} from "@/app/lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_COOKIE_NAME = "forge8004-auth-status";
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function setAuthCookie() {
  const isSecure =
    typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${AUTH_COOKIE_NAME}=authenticated; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}

function deleteAuthCookie() {
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hasReceivedFirstCallback = useRef(false);

  useEffect(() => {
    resolveRedirectSignInResult().catch(() => null);

    const unsubscribe = subscribeToAuthState((currentUser) => {
      const wasAuthenticated =
        hasReceivedFirstCallback.current && user !== null;
      setUser(currentUser);

      if (hasReceivedFirstCallback.current) {
        // Only modify cookie after initial load resolves
        if (currentUser) {
          setAuthCookie();
        } else if (wasAuthenticated) {
          // User signed out (was non-null, now null)
          deleteAuthCookie();
        }
      } else {
        // First callback — set cookie if authenticated, don't delete if null
        // (avoids premature deletion during page load)
        hasReceivedFirstCallback.current = true;
        if (currentUser) {
          setAuthCookie();
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
    } catch (err: any) {
      const code = typeof err?.code === "string" ? err.code : "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/web-storage-unsupported"
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
  }, []);

  const handleSignInWithEmail = useCallback(
    async (email: string, password: string) => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    [],
  );

  const handleRegisterWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      if (name.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() });
      }
    },
    [],
  );

  const handleSignOut = useCallback(async () => {
    await auth.signOut();
    deleteAuthCookie();
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithEmail: handleSignInWithEmail,
    registerWithEmail: handleRegisterWithEmail,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
