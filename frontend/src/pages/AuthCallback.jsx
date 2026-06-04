import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/App";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser, refresh } = useAuth();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const sessionId = params.get("session_id");
    if (!sessionId) {
      navigate("/", { replace: true });
      return;
    }
    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sessionId });
        setUser(data);
        // clean hash
        window.history.replaceState(null, "", window.location.pathname);
        // Refresh to get cookie-backed session
        await refresh();
        if (!data.age || !data.city) {
          navigate("/onboarding", { replace: true });
        } else {
          navigate("/explore", { replace: true });
        }
      } catch (e) {
        console.error(e);
        navigate("/", { replace: true });
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-ape-bg flex items-center justify-center">
      <div className="text-ape-text font-display text-2xl animate-pulse">Stiamo apparecchiando…</div>
    </div>
  );
}
