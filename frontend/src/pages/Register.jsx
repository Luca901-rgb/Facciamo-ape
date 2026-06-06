import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/App";
import { toast } from "sonner";
import AuthShell, { inputCls, btnPrimaryCls } from "@/pages/AuthShell";

export default function Register() {
  const navigate = useNavigate();
  const { setUser, refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const referrer_username = sessionStorage.getItem("ref") || undefined;
      const { data } = await api.post("/auth/register", {
        name,
        email,
        password,
        referrer_username,
      });
      sessionStorage.removeItem("ref");
      setUser(data);
      await refresh();
      toast.success("Account creato! Controlla la email di benvenuto.");
      navigate("/onboarding", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registrazione non riuscita");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Registrati" subtitle="Crea un account con email e password. Ti mandiamo un email di benvenuto.">
      <form onSubmit={handleSubmit}>
        <input
          data-testid="register-name-input"
          type="text"
          name="name"
          autoComplete="name"
          required
          placeholder="Il tuo nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
        <input
          data-testid="register-email-input"
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
          data-testid="register-password-input"
          type="password"
          name="new-password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Password (min. 8 caratteri)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
        <button data-testid="register-submit-button" type="submit" disabled={loading} className={btnPrimaryCls}>
          {loading ? "Creazione..." : "Crea account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-ape-textMuted">
        Hai già un account?{" "}
        <Link to="/login" className="text-ape-secondary hover:underline">
          Accedi
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
