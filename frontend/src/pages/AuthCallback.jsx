import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/App";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { completeAuth } = useAuth();

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
        const referrer_username = sessionStorage.getItem("ref") || undefined;
        const res = await api.post("/auth/session", { session_id: sessionId, referrer_username });
        sessionStorage.removeItem("ref");
        const user = completeAuth(res.data, res);
        window.history.replaceState(null, "", window.location.pathname);
        if (!user.age || !user.city) {
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
