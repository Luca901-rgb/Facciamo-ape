import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, fileUrl } from "@/lib/api";
import Nav from "@/components/Nav";
import { toast } from "sonner";
import { ArrowLeft, Clock, MapPin, Wine, Beer, Martini, GlassWater, Ban, Send } from "lucide-react";

const drinkIcon = (d) => {
  const map = { Birra: Beer, Vino: Wine, "Vino rosso": Wine, "Vino bianco": Wine, Cocktail: Martini, Spritz: Martini, Analcolico: GlassWater };
  const Icon = map[d] || Martini;
  return <Icon className="w-5 h-5" />;
};

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showMsg, setShowMsg] = useState(false);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`/users/${userId}`).then(({ data }) => setUser(data)).catch(() => navigate("/explore"));
  }, [userId]);

  const sendFirst = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post("/conversations", { target_user_id: userId, text: msg });
      toast.success("Messaggio inviato. Ora aspetta che ti risponda 🤞");
      navigate(`/chat/${data.conversation_id}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Errore");
    } finally {
      setSending(false);
    }
  };

  const block = async () => {
    if (!confirm("Bloccare " + user.name + "?")) return;
    await api.post(`/users/block/${userId}`);
    toast.success("Utente bloccato");
    navigate("/explore");
  };

  if (!user) return <div className="min-h-screen bg-ape-bg" />;

  return (
    <div className="min-h-screen bg-ape-bg text-ape-text pb-24 md:pb-12">
      <Nav />
      <main className="max-w-2xl mx-auto px-5 sm:px-8 pt-6">
        <button onClick={() => navigate(-1)} data-testid="back-btn" className="flex items-center gap-2 text-ape-textMuted hover:text-ape-text mb-6">
          <ArrowLeft className="w-4 h-4" /> Indietro
        </button>

        <div className="bg-ape-surface border border-ape-border rounded-3xl overflow-hidden">
          <div className="aspect-square relative">
            <img src={user.photo_path ? fileUrl(user.photo_path) : (user.picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=600&h=600&fit=crop")} alt={user.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ape-surface via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-baseline gap-3">
                <h1 className="font-display font-black text-4xl tracking-tighter">{user.name}</h1>
                <span className="text-2xl text-ape-textMuted">{user.age}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-ape-textMuted">
                <MapPin className="w-4 h-4 text-ape-primary" />
                <span>{user.zone}, {user.city}</span>
                {user.distance_km != null && <span className="text-ape-secondary font-bold">· {user.distance_km}km</span>}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-ape-bg/60 border border-ape-border rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2"><Clock className="w-3 h-3" /> Quando</div>
                <div className="font-display font-bold text-xl">{user.time_slot}</div>
              </div>
              <div className="bg-ape-bg/60 border border-ape-border rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2">{drinkIcon(user.drink)} Beve</div>
                <div className="font-display font-bold text-xl">{user.drink}</div>
              </div>
            </div>

            {user.bio && (
              <div>
                <div className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2">Bio</div>
                <p className="text-ape-text leading-relaxed">{user.bio}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-ape-border">
              <div className="text-sm">
                <span className="font-display font-black text-2xl text-ape-primary">{user.aperitivi_count}</span>
                <span className="text-ape-textMuted ml-2">aperitivi sull'app</span>
              </div>
              <div className="text-xs text-ape-textMuted font-mono">@{user.username}</div>
            </div>
          </div>
        </div>

        {!showMsg ? (
          <div className="mt-6 flex gap-3">
            <button data-testid="open-message-btn" onClick={() => setShowMsg(true)} className="flex-1 bg-ape-primary hover:bg-ape-primaryHover text-ape-text font-bold rounded-full px-6 py-4 transition-all shadow-[0_0_25px_rgba(232,93,4,0.4)]">
              Scrivi a {user.name?.split(" ")[0]} →
            </button>
            <button data-testid="block-btn" onClick={block} className="border border-ape-border hover:border-red-500 hover:text-red-400 text-ape-textMuted rounded-full p-4 transition-colors" title="Blocca">
              <Ban className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="mt-6 bg-ape-surface border border-ape-border rounded-3xl p-5">
            <p className="text-xs text-ape-textMuted mb-3 uppercase tracking-[0.2em] font-bold">Il primo messaggio è libero. Falla bella.</p>
            <textarea
              data-testid="first-message-input"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={3}
              placeholder={`Ciao ${user.name?.split(" ")[0]}, ti va un calice stasera?`}
              className="w-full bg-ape-bg border border-ape-border focus:border-ape-primary rounded-2xl px-4 py-3 outline-none resize-none"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowMsg(false)} className="text-ape-textMuted hover:text-ape-text px-4 py-2 text-sm">Annulla</button>
              <button data-testid="send-first-btn" onClick={sendFirst} disabled={sending || !msg.trim()} className="ml-auto bg-ape-primary hover:bg-ape-primaryHover disabled:opacity-50 text-ape-text font-bold rounded-full px-6 py-3 flex items-center gap-2">
                <Send className="w-4 h-4" /> Invia
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
