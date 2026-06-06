import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import AuthShell, { inputCls, btnPrimaryCls } from "@/pages/AuthShell";

export default function ResetPassword() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Le password non coincidono");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password aggiornata");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Link non valido o scaduto");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Link non valido">
        <p className="text-ape-textMuted text-sm mb-4">Richiedi un nuovo link dalla pagina password dimenticata.</p>
        <Link to="/forgot-password" className="text-ape-secondary hover:underline text-sm">
          Reimposta password
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Nuova password" subtitle="Scegli una password di almeno 8 caratteri.">
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          name="new-password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Nuova password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
        <input
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Conferma password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputCls}
        />
        <button type="submit" disabled={loading} className={btnPrimaryCls}>
          {loading ? "Salvataggio..." : "Salva password"}
        </button>
      </form>
    </AuthShell>
  );
}
