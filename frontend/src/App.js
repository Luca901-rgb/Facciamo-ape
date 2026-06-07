import { useEffect, useState, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { api, applyAuthResponse, getSessionToken, setSessionToken } from "@/lib/api";
import { isProfileComplete } from "@/lib/profile";
import { isSuperAdmin, getPostLoginPath } from "@/lib/admin";
import { ChatProvider } from "@/context/ChatContext";

import Landing from "@/pages/Landing";
import AuthCallback from "@/pages/AuthCallback";
import MagicLinkVerify from "@/pages/MagicLinkVerify";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Onboarding from "@/pages/Onboarding";
import Explore from "@/pages/Explore";
import Profile from "@/pages/Profile";
import ProfileMe from "@/pages/ProfileMe";
import Chat from "@/pages/Chat";
import ChatDetail from "@/pages/ChatDetail";
import Admin from "@/pages/Admin";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!getSessionToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setSessionToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const completeAuth = (data, response) => {
    const user = applyAuthResponse(data, response);
    setUser(user);
    return user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setSessionToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    if (window.location.pathname === "/auth/verify" && new URLSearchParams(window.location.search).get("token")) {
      setLoading(false);
      return;
    }
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, refresh, completeAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function Protected({ children, needsOnboarding = true }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen bg-ape-bg flex items-center justify-center">
        <div className="text-ape-textMuted">Caricamento…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (isSuperAdmin(user) && location.pathname !== "/admin") {
    return <Navigate to="/admin" replace />;
  }
  if (needsOnboarding && !isProfileComplete(user) && !isSuperAdmin(user)) {
    if (location.pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-ape-bg flex items-center justify-center">
        <div className="text-ape-textMuted">Caricamento…</div>
      </div>
    );
  }
  if (user) {
    const dest = getPostLoginPath(user) || (isProfileComplete(user) ? "/explore" : "/onboarding");
    return <Navigate to={dest} replace />;
  }
  return children;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route path="/auth/verify" element={<MagicLinkVerify />} />
      <Route path="/onboarding" element={<Protected needsOnboarding={false}><Onboarding /></Protected>} />
      <Route path="/explore" element={<Protected><Explore /></Protected>} />
      <Route path="/me" element={<Protected><ProfileMe /></Protected>} />
      <Route path="/profile/:userId" element={<Protected><Profile /></Protected>} />
      <Route path="/chat" element={<Protected><Chat /></Protected>} />
      <Route path="/chat/:convId" element={<Protected><ChatDetail /></Protected>} />
      <Route path="/admin" element={<Protected needsOnboarding={false}><Admin /></Protected>} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App font-body">
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
            <AppRouter />
            <Toaster theme="dark" position="top-center" />
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
