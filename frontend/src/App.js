import { useEffect, useState, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { api } from "@/lib/api";

import Landing from "@/pages/Landing";
import AuthCallback from "@/pages/AuthCallback";
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
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, refresh }}>
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
  if (!user) return <Navigate to="/" replace />;
  if (needsOnboarding && (!user.age || !user.city || !user.zone || !user.time_slot || !user.drink)) {
    if (location.pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
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
      <Route path="/onboarding" element={<Protected needsOnboarding={false}><Onboarding /></Protected>} />
      <Route path="/explore" element={<Protected><Explore /></Protected>} />
      <Route path="/me" element={<Protected><ProfileMe /></Protected>} />
      <Route path="/profile/:userId" element={<Protected><Profile /></Protected>} />
      <Route path="/chat" element={<Protected><Chat /></Protected>} />
      <Route path="/chat/:convId" element={<Protected><ChatDetail /></Protected>} />
      <Route path="/admin" element={<Protected><Admin /></Protected>} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App font-body">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster theme="dark" position="top-center" />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
