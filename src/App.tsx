import { useEffect, useState } from "react";
import { useAuth } from "./auth/AuthContext";
import Landing from "./components/Landing";
import Dashboard from "./components/Dashboard";
import LoginModal from "./components/LoginModal";

/* ════════════════════════════════════════════════════════════════
   App shell / gatekeeper
   not signed in  → landing page (+ login popup)
   signed in      → the live dashboard
   ════════════════════════════════════════════════════════════════ */

export default function App() {
  const { user, ready } = useAuth();
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");

  /* close the popup automatically once signed in */
  useEffect(() => { if (user) setModal(false); }, [user]);

  if (!ready) {
    return (
      <div className="boot">
        <div className="blob blob-1" />
        <div className="blob blob-4" />
        <div className="boot-inner">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" className="scene-bob">
            <circle cx="12" cy="12" r="3.2" fill="#d9886b" />
            <path d="M8.4 8.4a5.1 5.1 0 0 0 0 7.2M15.6 8.4a5.1 5.1 0 0 1 0 7.2" stroke="#e39aa4" strokeWidth="2" strokeLinecap="round" />
            <path d="M5.8 5.8a8.8 8.8 0 0 0 0 12.4M18.2 5.8a8.8 8.8 0 0 1 0 12.4" stroke="#7fae8a" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <p>warming up the sensors…</p>
        </div>
      </div>
    );
  }

  if (user) return <Dashboard />;

  return (
    <>
      <Landing
        onAuth={(m) => {
          setMode(m);
          setModal(true);
        }}
      />
      <LoginModal open={modal} initialMode={mode} onClose={() => setModal(false)} />
    </>
  );
}
