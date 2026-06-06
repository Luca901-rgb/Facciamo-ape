import { NavLink, useNavigate } from "react-router-dom";
import { Compass, MessageCircle, User, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/App";

export default function Nav() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const linkCls = ({ isActive }) =>
    `flex flex-col items-center gap-1 text-xs font-bold transition-colors ${isActive ? "text-ape-primary" : "text-ape-textMuted hover:text-ape-text"}`;

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-ape-surface/95 backdrop-blur-xl border-t border-ape-border px-4 py-3 flex justify-around">
        <NavLink to="/explore" data-testid="nav-explore" className={linkCls}>
          <Compass className="w-5 h-5" /> Esplora
        </NavLink>
        <NavLink to="/chat" data-testid="nav-chat" className={linkCls}>
          <MessageCircle className="w-5 h-5" /> Chat
        </NavLink>
        <NavLink to="/me" data-testid="nav-me" className={linkCls}>
          <User className="w-5 h-5" /> Tu
        </NavLink>
        {user?.is_admin && (
          <NavLink to="/admin" data-testid="nav-admin" className={linkCls}>
            <Shield className="w-5 h-5" /> Mod
          </NavLink>
        )}
      </nav>

      {/* Desktop top nav */}
      <nav className="hidden md:flex sticky top-0 z-50 bg-ape-bg/80 backdrop-blur-xl border-b border-ape-border px-12 py-4 justify-between items-center">
        <NavLink to="/explore" className="font-display font-black text-2xl tracking-tighter">
          Facciamo<span className="text-ape-primary">Ape?</span>
        </NavLink>
        <div className="flex items-center gap-8">
          <NavLink to="/explore" data-testid="nav-explore-d" className={linkCls}><Compass className="w-5 h-5" /><span>Esplora</span></NavLink>
          <NavLink to="/chat" data-testid="nav-chat-d" className={linkCls}><MessageCircle className="w-5 h-5" /><span>Chat</span></NavLink>
          <NavLink to="/me" data-testid="nav-me-d" className={linkCls}><User className="w-5 h-5" /><span>Profilo</span></NavLink>
          {user?.is_admin && <NavLink to="/admin" data-testid="nav-admin-d" className={linkCls}><Shield className="w-5 h-5" /><span>Mod</span></NavLink>}
          <button onClick={handleLogout} data-testid="nav-logout" className="text-ape-textMuted hover:text-ape-primary"><LogOut className="w-5 h-5" /></button>
        </div>
      </nav>
    </>
  );
}
