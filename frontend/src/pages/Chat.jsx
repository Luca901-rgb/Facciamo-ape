import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fileUrl } from "@/lib/api";
import Nav from "@/components/Nav";
import { Users } from "lucide-react";

export default function Chat() {
  const navigate = useNavigate();
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/conversations").then(({ data }) => {
      setConvs(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-ape-bg text-ape-text pb-24 md:pb-12">
      <Nav />
      <main className="max-w-2xl mx-auto px-5 sm:px-8 pt-6">
        <h1 className="font-display font-black text-4xl tracking-tighter mb-8">Le tue chat</h1>

        {loading ? (
          <div className="text-ape-textMuted">Caricamento…</div>
        ) : convs.length === 0 ? (
          <div className="bg-ape-surface border border-ape-border rounded-2xl p-8 text-center">
            <p className="text-ape-textMuted mb-4">Non hai ancora chat aperte.</p>
            <button onClick={() => navigate("/explore")} data-testid="chat-empty-explore-btn" className="bg-ape-primary hover:bg-ape-primaryHover text-ape-text font-bold rounded-full px-6 py-3">
              Esplora profili →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {convs.map((c) => {
              const others = c.other_participants || [];
              const main = others[0];
              const title = c.is_group ? `Gruppo · ${others.map(o => o.name?.split(" ")[0]).join(", ")}` : (main?.name || "—");
              const avatar = main?.photo_path ? fileUrl(main.photo_path) : main?.picture;
              return (
                <button key={c.id} onClick={() => navigate(`/chat/${c.id}`)} data-testid={`conv-${c.id}`} className="w-full flex items-center gap-4 bg-ape-surface border border-ape-border hover:border-ape-primary/50 rounded-2xl p-4 transition-colors text-left">
                  <div className="relative">
                    {c.is_group ? (
                      <div className="w-14 h-14 rounded-full bg-ape-primary/20 border border-ape-primary flex items-center justify-center">
                        <Users className="w-6 h-6 text-ape-primary" />
                      </div>
                    ) : (
                      <img src={avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop"} alt={title} className="w-14 h-14 rounded-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-display font-bold text-lg truncate">{title}</div>
                      {!c.accepted && !c.is_group && <span className="text-[10px] uppercase tracking-wider bg-ape-primary/20 text-ape-secondary px-2 py-0.5 rounded-full">in attesa</span>}
                    </div>
                    {c.last_message && <p className="text-sm text-ape-textMuted truncate">{c.last_message.text}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
