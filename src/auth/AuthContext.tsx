import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../firebase";

export interface AppUser {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
}

interface AuthCtx {
  user: AppUser | null;
  ready: boolean;
  demoMode: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const DEMO_KEY = "lsd.demo.user";
const DEMO_DB = "lsd.demo.accounts";

/* friendly messages instead of raw firebase codes */
export function prettyError(e: unknown): string {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
  const map: Record<string, string> = {
    "auth/invalid-email": "That email doesn't look quite right.",
    "auth/missing-password": "Please enter your password.",
    "auth/weak-password": "Password needs to be at least 6 characters.",
    "auth/email-already-in-use": "An account with this email already exists — try signing in.",
    "auth/invalid-credential": "Email or password doesn't match. Please try again.",
    "auth/wrong-password": "That password isn't right.",
    "auth/user-not-found": "No account with that email yet — try creating one.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and retry.",
    "auth/popup-closed-by-user": "The Google window was closed before finishing.",
    "auth/popup-blocked": "Your browser blocked the popup — please allow popups and retry.",
    "auth/unauthorized-domain": "This domain isn't authorised in Firebase yet (add it under Authentication → Settings).",
    "auth/operation-not-allowed": "This sign-in method isn't enabled in your Firebase console yet.",
  };
  if (code && map[code]) return map[code];
  if (e instanceof Error && e.message) return e.message.replace("Firebase: ", "");
  return "Something went wrong. Please try again.";
}

/* ── demo mode helpers (used only when Firebase keys are absent) ── */
type DemoAccount = { name: string; email: string; password: string };
const readDemoAccounts = (): DemoAccount[] => {
  try { return JSON.parse(localStorage.getItem(DEMO_DB) ?? "[]"); } catch { return []; }
};
const writeDemoAccounts = (a: DemoAccount[]) => localStorage.setItem(DEMO_DB, JSON.stringify(a));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const demoMode = !isFirebaseConfigured || !auth;

  /* restore session */
  useEffect(() => {
    if (demoMode) {
      try {
        const raw = localStorage.getItem(DEMO_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch { /* ignore */ }
      setReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth!, (u) => {
      setUser(
        u ? { uid: u.uid, name: u.displayName, email: u.email, photoURL: u.photoURL } : null
      );
      setReady(true);
    });
    return unsub;
  }, [demoMode]);

  const setDemoUser = (u: AppUser) => {
    localStorage.setItem(DEMO_KEY, JSON.stringify(u));
    setUser(u);
  };

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      ready,
      demoMode,

      async signInEmail(email, password) {
        if (demoMode) {
          await wait(500);
          const acc = readDemoAccounts().find((a) => a.email.toLowerCase() === email.toLowerCase());
          if (!acc) throw new Error("No demo account with that email — create one first.");
          if (acc.password !== password) throw new Error("That password isn't right.");
          setDemoUser({ uid: `demo-${acc.email}`, name: acc.name, email: acc.email, photoURL: null });
          return;
        }
        await signInWithEmailAndPassword(auth!, email, password);
      },

      async signUpEmail(name, email, password) {
        if (demoMode) {
          await wait(500);
          const all = readDemoAccounts();
          if (all.some((a) => a.email.toLowerCase() === email.toLowerCase()))
            throw new Error("An account with this email already exists — try signing in.");
          all.push({ name, email, password });
          writeDemoAccounts(all);
          setDemoUser({ uid: `demo-${email}`, name, email, photoURL: null });
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth!, email, password);
        if (name) {
          await updateProfile(cred.user, { displayName: name });
          setUser({ uid: cred.user.uid, name, email: cred.user.email, photoURL: cred.user.photoURL });
        }
      },

      async signInGoogle() {
        if (demoMode) {
          await wait(600);
          setDemoUser({
            uid: "demo-google",
            name: "Demo Explorer",
            email: "demo.explorer@example.com",
            photoURL: null,
          });
          return;
        }
        await signInWithPopup(auth!, googleProvider);
      },

      async signOut() {
        if (demoMode) {
          localStorage.removeItem(DEMO_KEY);
          setUser(null);
          return;
        }
        await fbSignOut(auth!);
      },
    }),
    [user, ready, demoMode]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
