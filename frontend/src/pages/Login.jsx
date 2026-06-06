import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/App";
import { toast } from "sonner";
import AuthShell, { inputCls, btnPrimaryCls } from "@/pages/AuthShell";

export default function Login() {
  const navigate = useNavigate();
  const { setUser, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      await refresh();
      if (!data.age || !data.city || !data.zone || !data.time_slot || !data.drink) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/explore", { replace: true });
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Accesso non riuscito");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Accedi" subtitle="Email e password — resti loggato 7 giorni.">
      <form onSubmit={handleSubmit}>
        <input
          data-testid="login-email-input"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
        <input
          data-testid="login-password-input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          minLength={8}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
        <button data-testid="login-submit-button" type="submit" disabled={loading} className={btnPrimaryCls}>
          {loading ? "Accesso..." : "Entra"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-ape-textMuted">
        <Link to="/forgot-password" className="text-ape-secondary hover:underline">
          Password dimenticata?
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-ape-textMuted">
        Non hai un account?{" "}
        <Link to="/register" className="text-ape-secondary hover:underline">
          Registrati
        </Link>
      </p>
      <p className="mt-6 text-center">
        <Link to="/" className="text-sm text-ape-textMuted hover:text-ape-text">
          ← Torna alla home
        </Link>
      </p>
    </AuthShell>
  );
}
