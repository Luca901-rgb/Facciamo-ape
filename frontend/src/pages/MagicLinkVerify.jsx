import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/App";
import { toast } from "sonner";

export default function MagicLinkVerify() {
  const navigate = useNavigate();
  const { completeAuth } = useAuth();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    (async () => {
      try {
        const referrer_username = sessionStorage.getItem("ref") || undefined;
        const { data } = await api.post("/auth/magic-link/verify", { token, referrer_username });
        sessionStorage.removeItem("ref");
        const user = completeAuth(data);
        window.history.replaceState(null, "", window.location.pathname);
        if (!user.age || !user.city || !user.zone || !user.time_slot || !user.drink) {
          navigate("/onboarding", { replace: true });
        } else {
          navigate("/explore", { replace: true });
        }
      } catch {
        toast.error("Link non valido o scaduto. Richiedine uno nuovo.");
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
