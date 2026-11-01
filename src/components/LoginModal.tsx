import { useEffect, useRef, useState } from "react";
import { X, Eye, EyeOff, Loader2, TriangleAlert, Sparkle } from "lucide-react";
import { useAuth, prettyError } from "../auth/AuthContext";

type Mode = "in" | "up";

export default function LoginModal({
  open,
  onClose,
  initialMode = "in",
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
}) {
  const { signInEmail, signUpEmail, signInGoogle, demoMode } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState<"" | "email" | "google">("");
  const [err, setErr] = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setMode(initialMode); }, [open, initialMode]);

  useEffect(() => {
    if (!open) { setErr(""); setBusy(""); setPw(""); return; }
    const t = setTimeout(() => firstRef.current?.focus(), 120);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!email.trim()) return setErr("Please enter your email.");
    if (pw.length < 6) return setErr("Password needs to be at least 6 characters.");
    if (mode === "up" && !name.trim()) return setErr("Please tell us your name.");
    setBusy("email");
    try {
      if (mode === "in") await signInEmail(email.trim(), pw);
      else await signUpEmail(name.trim(), email.trim(), pw);
      onClose();
    } catch (e2) {
      setErr(prettyError(e2));
      setBusy("");
    }
  };

  const google = async () => {
    setErr("");
    setBusy("google");
    try {
      await signInGoogle();
      onClose();
    } catch (e2) {
      setErr(prettyError(e2));
      setBusy("");
    }
  };

  return (
    <div className="modal-veil" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card" role="dialog" aria-modal="true" aria-label="Sign in">
        <button className="modal-x" onClick={onClose} aria-label="Close">
          <X size={17} strokeWidth={2.4} />
        </button>

        {/* little lock illustration */}
        <div className="modal-art">
          <svg width="76" height="76" viewBox="0 0 80 80" fill="none" className="scene-bob">
            <circle cx="40" cy="40" r="31" fill="#fbeae3" />
            <path d="M29 36v-6a11 11 0 0 1 22 0v6" stroke="#d9886b" strokeWidth="4" strokeLinecap="round" />
            <rect x="23" y="36" width="34" height="27" rx="9" fill="#fff" stroke="#e39aa4" strokeWidth="3" />
            <circle cx="40" cy="47" r="4" fill="#d9886b" />
            <path d="M40 50v5" stroke="#d9886b" strokeWidth="3" strokeLinecap="round" />
            <circle cx="31" cy="56" r="2.4" fill="#f7dbe0" />
            <circle cx="49" cy="56" r="2.4" fill="#f7dbe0" />
          </svg>
          <span className="sparkle sp-butter tw1" style={{ top: 6, right: 96 }} />
          <span className="sparkle sp-sage tw2" style={{ top: 44, left: 92 }} />
        </div>

        <h2 className="modal-title">{mode === "in" ? "Welcome back" : "Make an account"}</h2>
        <p className="modal-sub">
          {mode === "in"
            ? "Sign in to open your live sensor dashboard."
            : "A few small details and the dashboard is yours."}
        </p>

        {demoMode && (
          <div className="demo-note">
            <Sparkle size={13} strokeWidth={2.4} />
            <span>
              <b>Demo mode</b> — no Firebase keys found, so accounts are saved in this browser only.
              Google sign-in is simulated.
            </span>
          </div>
        )}

        <button className="google-btn" onClick={google} disabled={busy !== ""}>
          {busy === "google" ? (
            <Loader2 size={17} className="spin" />
          ) : (
            <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.0 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.0 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C39.9 36.8 44 31 44 24c0-1.3-.1-2.6-.4-3.9z" />
            </svg>
          )}
          Continue with Google
        </button>

        <div className="or-line"><span>or with email</span></div>

        <form onSubmit={submit}>
          {mode === "up" && (
            <div className="field">
              <label htmlFor="f-name">Your name</label>
              <input
                id="f-name"
                ref={mode === "up" ? firstRef : undefined}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                autoComplete="name"
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="f-email">Email</label>
            <input
              id="f-email"
              ref={mode === "in" ? firstRef : undefined}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="f-pw">Password</label>
            <div className="pw-wrap">
              <input
                id="f-pw"
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="at least 6 characters"
                autoComplete={mode === "in" ? "current-password" : "new-password"}
              />
              <button type="button" className="pw-eye" onClick={() => setShowPw((s) => !s)} aria-label="Toggle password visibility">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {err && (
            <div className="form-err">
              <TriangleAlert size={14} strokeWidth={2.4} />
              <span>{err}</span>
            </div>
          )}

          <button className="btn btn-wide" type="submit" disabled={busy !== ""}>
            {busy === "email" && <Loader2 size={15} className="spin" />}
            {mode === "in" ? "Sign in & open dashboard" : "Create account & enter"}
          </button>
        </form>

        <p className="modal-switch">
          {mode === "in" ? "New here?" : "Already have an account?"}{" "}
          <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }}>
            {mode === "in" ? "Create an account" : "Sign in instead"}
          </button>
        </p>
      </div>
    </div>
  );
}
