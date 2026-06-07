import { useNavigate } from "react-router-dom";
import { LogOut, Shield } from "lucide-react";
import { useAuth } from "@/App";

export default function AdminShell({ children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-ape-bg text-ape-text">
      <header className="sticky top-0 z-50 bg-ape-bg/90 backdrop-blur-xl border-b border-ape-border px-5 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-ape-primary" />
          <div>
            <div className="font-display font-black text-xl tracking-tighter">FacciamoApe Admin</div>
            <div className="text-xs text-ape-textMuted">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="admin-logout"
          className="flex items-center gap-2 text-sm font-bold text-ape-textMuted hover:text-ape-primary transition-colors"
        >
          <LogOut className="w-4 h-4" /> Esci
        </button>
      </header>
      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8">{children}</main>
    </div>
  );
}
