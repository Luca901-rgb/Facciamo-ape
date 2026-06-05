import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, fileUrl, wsUrl } from "@/lib/api";
import Nav from "@/components/Nav";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { ArrowLeft, Send, UserPlus, Users, Check, Lock, Ban } from "lucide-react";

export default function ChatDetail() {
  const { convId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conv, setConv] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const wsRef = useRef(null);
  const bottomRef = useRef(null);

  const load = async () => {
    const { data } = await api.get(`/conversations/${convId}`);
    setConv(data);
  };

  useEffect(() => {
    load();
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages?.length]);

  // WebSocket realtime
  useEffect(() => {
    if (!user) return;
    let ws;
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/auth/ws-token");
        if (!data?.ws_token || !alive) return;
        ws = new WebSocket(wsUrl(data.ws_token));
        wsRef.current = ws;
        ws.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            if (payload.conversation_id === convId) {
              load();
            }
          } catch {}
        };
      } catch {}
    })();
    return () => {
      alive = false;
      try { ws && ws.close(); } catch {}
    };
  }, [user, convId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.post(`/conversations/${convId}/messages`, { text });
      setText("");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Non puoi inviare");
    } finally {
      setSending(false);
    }
  };

  const accept = async () => {
    await api.post(`/conversations/${convId}/accept`);
    await load();
    toast.success("Accettato. Ora potete parlare 🍊");
  };

  const addUser = async () => {
    if (!newUsername.trim()) return;
    try {
      await api.post(`/conversations/${convId}/add_participant`, { username: newUsername.trim().toLowerCase() });
      setNewUsername("");
      setShowAdd(false);
      await load();
      toast.success("Aggiunto in chat");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Errore");
    }
  };

  const blockOther = async () => {
    const other = conv?.participants_info?.find((p) => p.user_id !== user.user_id);
    if (!other) return;
    if (!confirm(`Bloccare ${other.name}?`)) return;
    await api.post(`/users/block/${other.user_id}`);
    toast.success("Bloccato");
    navigate("/chat");
  };

  if (!conv) return <div className="min-h-screen bg-ape-bg" />;

  const others = conv.participants_info?.filter((p) => p.user_id !== user.user_id) || [];
  const otherMain = others[0];
  const title = conv.is_group ? `Gruppo (${conv.participants_info.length})` : otherMain?.name || "—";
  const subtitle = conv.is_group ? conv.participants_info.map((p) => p.name?.split(" ")[0]).join(", ") : `@${otherMain?.username}`;
  const isInitiator = (conv.initiated_by || []).includes(user.user_id);
  const showAcceptBanner = !conv.is_group && !conv.accepted && !isInitiator;

  return (
    <div className="min-h-screen bg-ape-bg text-ape-text flex flex-col pb-24 md:pb-12">
      <Nav />
      <header className="sticky top-0 z-30 bg-ape-bg/95 backdrop-blur-xl border-b border-ape-border px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/chat")} data-testid="chat-back-btn"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {conv.is_group ? (
            <div className="w-10 h-10 rounded-full bg-ape-primary/20 border border-ape-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-ape-primary" />
            </div>
          ) : (
            <img src={otherMain?.photo_path ? fileUrl(otherMain.photo_path) : otherMain?.picture} alt={title} className="w-10 h-10 rounded-full object-cover" />
          )}
          <div className="min-w-0">
            <div className="font-display font-bold truncate">{title}</div>
            <div className="text-xs text-ape-textMuted truncate">{subtitle}</div>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} data-testid="chat-add-btn" className="text-ape-textMuted hover:text-ape-secondary p-2"><UserPlus className="w-5 h-5" /></button>
        {!conv.is_group && (
          <button onClick={blockOther} data-testid="chat-block-btn" className="text-ape-textMuted hover:text-red-400 p-2"><Ban className="w-5 h-5" /></button>
        )}
      </header>

      <main className="flex-1 px-5 py-6 max-w-2xl mx-auto w-full space-y-3 overflow-y-auto">
        {conv.messages?.map((m) => {
          const mine = m.sender_id === user.user_id;
          const sender = conv.participants_info?.find((p) => p.user_id === m.sender_id);
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${mine ? "bg-ape-primary text-ape-text rounded-br-sm" : "bg-ape-surface border border-ape-border rounded-bl-sm"}`}>
                {conv.is_group && !mine && <div className="text-xs font-bold text-ape-secondary mb-1">{sender?.name?.split(" ")[0]}</div>}
                <p className="leading-relaxed break-words">{m.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </main>

      {showAcceptBanner && (
        <div className="px-5 py-4 bg-ape-primary/10 border-t border-ape-primary/30 flex items-center justify-between gap-3 max-w-2xl mx-auto w-full">
          <p className="text-sm">Ti ha scritto. Accetta per sbloccare la chat (oppure rispondi e si sblocca da sola).</p>
          <button onClick={accept} data-testid="chat-accept-btn" className="bg-ape-primary text-ape-text font-bold rounded-full px-4 py-2 text-sm flex items-center gap-2"><Check className="w-4 h-4" /> Accetta</button>
        </div>
      )}

      <footer className="sticky bottom-16 md:bottom-0 bg-ape-bg/95 backdrop-blur-xl border-t border-ape-border px-5 py-3 max-w-2xl mx-auto w-full">
        {conv.can_send ? (
          <div className="flex gap-2 items-center">
            <input
              data-testid="chat-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Scrivi un messaggio…"
              className="flex-1 bg-ape-surface border border-ape-border focus:border-ape-primary rounded-full px-5 py-3 outline-none"
            />
            <button onClick={send} disabled={sending || !text.trim()} data-testid="chat-send-btn" className="bg-ape-primary hover:bg-ape-primaryHover disabled:opacity-50 text-ape-text rounded-full p-3 transition-colors">
              <Send className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-ape-textMuted px-3 py-3 bg-ape-surface border border-ape-border rounded-2xl">
            <Lock className="w-4 h-4 text-ape-secondary" />
            <span>{conv.block_reason === "blocked" ? "Non puoi più scrivere qui." : "In attesa che ti accetti. Quando lo fa, sblocchi la chat e potrai scrivere quanto vuoi."}</span>
          </div>
        )}
      </footer>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-5" onClick={() => setShowAdd(false)}>
          <div className="bg-ape-surface border border-ape-border rounded-3xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-xl mb-2">Aggiungi alla chat</h3>
            <p className="text-sm text-ape-textMuted mb-4">Inserisci lo username della persona da invitare. Diventerà chat di gruppo.</p>
            <input data-testid="chat-add-username-input" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="@username" className="w-full bg-ape-bg border border-ape-border focus:border-ape-primary rounded-xl px-4 py-3 outline-none mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 border border-ape-border rounded-full py-3 font-bold">Annulla</button>
              <button onClick={addUser} data-testid="chat-add-confirm-btn" className="flex-1 bg-ape-primary text-ape-text font-bold rounded-full py-3">Aggiungi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
