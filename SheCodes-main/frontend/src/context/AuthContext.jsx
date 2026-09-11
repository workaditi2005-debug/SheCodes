import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../firebase";
import { registerFirebaseTokenGetter } from "../services/api";

const AuthContext = createContext(null);

/**
 * Maps Firebase Auth error codes to user-friendly messages suitable
 * for patients, caregivers, and clinicians.
 */
function mapAuthError(error) {
  if (!error) return "An unexpected error occurred.";
  const code = error.code || "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password. Please verify your credentials.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists. Please sign in instead.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters with letters and numbers.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/popup-closed-by-user":
      return "Google Sign-In was cancelled before completing.";
    case "auth/popup-blocked":
      return "Google Sign-In popup was blocked by your browser. Please allow popups for this site.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few moments before trying again.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in Firebase project settings.";
    default:
      return error.message || "Authentication failed. Please try again.";
  }
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Subscribe to Firebase Auth state safely
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setFirebaseUser(user);
        setLoading(false);
      },
      (err) => {
        console.error("Firebase auth state change error:", err);
        setAuthError(mapAuthError(err));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /**
   * Retrieve the current Firebase ID token.
   * Prepared for future phase when backend verifies Firebase tokens.
   */
  const getIdToken = useCallback(
    async (forceRefresh = false) => {
      if (!auth || !auth.currentUser) return null;
      try {
        return await auth.currentUser.getIdToken(forceRefresh);
      } catch (err) {
        console.error("Failed to retrieve Firebase ID token:", err);
        return null;
      }
    },
    []
  );

  // Register the token getter with the API service layer
  useEffect(() => {
    registerFirebaseTokenGetter(getIdToken);
  }, [getIdToken]);

  /**
   * Sign in with Email and Password using Firebase Auth.
   */
  const signInWithEmail = useCallback(async (email, password) => {
    setAuthError(null);
    if (!auth) {
      const msg = "Firebase Authentication is not configured on this environment. Please run in SIH Demo mode or configure VITE_FIREBASE_API_KEY in .env.";
      setAuthError(msg);
      throw new Error(msg);
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      return userCredential;
    } catch (err) {
      const friendlyMsg = mapAuthError(err);
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, []);

  /**
   * Register with Email and Password using Firebase Auth.
   */
  const signUpWithEmail = useCallback(async (email, password) => {
    setAuthError(null);
    if (!auth) {
      const msg = "Firebase Authentication is not configured on this environment. Please run in SIH Demo mode or configure VITE_FIREBASE_API_KEY in .env.";
      setAuthError(msg);
      throw new Error(msg);
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      return userCredential;
    } catch (err) {
      const friendlyMsg = mapAuthError(err);
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, []);

  /**
   * Sign in with Google using Firebase Auth popup.
   */
  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    if (!auth || !googleProvider) {
      const msg = "Google Sign-In is not configured on this environment. Please run in SIH Demo mode or configure Firebase.";
      setAuthError(msg);
      throw new Error(msg);
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result;
    } catch (err) {
      const friendlyMsg = mapAuthError(err);
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, []);

  /**
   * Sign out from Firebase Auth.
   */
  const logout = useCallback(async () => {
    setAuthError(null);
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (err) {
      const friendlyMsg = mapAuthError(err);
      setAuthError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, []);

  /**
   * Clean interface providing Firebase identity info.
   * Separates identity (Firebase Auth) from NeuroAid application data (FastAPI / Supabase).
   */
  const getFirebaseIdentity = useCallback(() => {
    if (!firebaseUser) return null;
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
    };
  }, [firebaseUser]);

  const value = {
    firebaseUser,
    loading,
    isAuthenticated: Boolean(firebaseUser),
    isFirebaseConfigured,
    authError,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    logout,
    getIdToken,
    getFirebaseIdentity,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
