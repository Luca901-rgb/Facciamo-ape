import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import AuthShell, { inputCls, btnPrimaryCls } from "@/pages/AuthShell";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
      toast.success("Controlla la tua email");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Richiesta non riuscita");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Password dimenticata"
      subtitle="Ti inviamo un link per reimpostarla (valido 1 ora)."
    >
      {sent ? (
        <p className="text-ape-textMuted text-sm leading-relaxed">
          Se <span className="text-ape-text font-medium">{email}</span> è registrata, riceverai a breve un link per
          reimpostare la password.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="La tua email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
          <button type="submit" disabled={loading} className={btnPrimaryCls}>
            {loading ? "Invio..." : "Invia link di reset"}
          </button>
        </form>
      )}
      <p className="mt-6 text-center">
        <Link to="/login" className="text-sm text-ape-secondary hover:underline">
          Torna al login
        </Link>
      </p>
    </AuthShell>
  );
}
