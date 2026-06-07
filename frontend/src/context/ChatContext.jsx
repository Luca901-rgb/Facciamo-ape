import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, wsUrl } from "@/lib/api";
import { useAuth } from "@/App";

const ChatContext = createContext(null);
export const useChat = () => useContext(ChatContext);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef(null);

  const refreshUnread = useCallback(() => {
    if (!user) return;
    api.get("/conversations/unread-count")
      .then(({ data }) => setUnreadCount(data.count || 0))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    refreshUnread();
    let ws;
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/auth/ws-token");
        if (!alive || !data?.ws_token) return;
        ws = new WebSocket(wsUrl(data.ws_token));
        wsRef.current = ws;
        ws.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            window.dispatchEvent(new CustomEvent("ape:chat", { detail: payload }));
            if (payload.type === "message" && payload.message?.sender_id !== user.user_id) {
              refreshUnread();
            }
          } catch {
            /* ignore */
          }
        };
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }, [user?.user_id, refreshUnread]);

  return (
    <ChatContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </ChatContext.Provider>
  );
}
