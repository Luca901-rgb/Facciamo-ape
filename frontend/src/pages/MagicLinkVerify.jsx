import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { getPostLoginPath } from "@/lib/admin";
import { isProfileComplete } from "@/lib/profile";
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
        const res = await api.post("/auth/magic-link/verify", { token, referrer_username });
        sessionStorage.removeItem("ref");
        const user = completeAuth(res.data, res);
        window.history.replaceState(null, "", window.location.pathname);
        navigate(getPostLoginPath(user) || (isProfileComplete(user) ? "/explore" : "/onboarding"), { replace: true });
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
