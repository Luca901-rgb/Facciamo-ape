import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fileUrl } from "@/lib/api";
import Nav from "@/components/Nav";
import { Wine, Beer, Martini, GlassWater, Clock, MapPin } from "lucide-react";

const drinkIcon = (d) => {
  const map = { Birra: Beer, Vino: Wine, "Vino rosso": Wine, "Vino bianco": Wine, Cocktail: Martini, Spritz: Martini, Analcolico: GlassWater };
  const Icon = map[d] || Martini;
  return <Icon className="w-4 h-4" />;
};

export default function Explore() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/users/nearby").then(({ data }) => {
      setUsers(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-ape-bg text-ape-text pb-24 md:pb-12">
      <Nav />
      <main className="px-5 sm:px-12 pt-6 sm:pt-10 max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-ape-secondary font-bold mb-3">Stasera in giro</p>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none">
            Chi c'è <span className="text-ape-primary italic">vicino</span> a te?
          </h1>
        </div>

        {loading ? (
          <div className="text-ape-textMuted">Cerco compagnia…</div>
        ) : users.length === 0 ? (
          <div className="bg-ape-surface border border-ape-border rounded-2xl p-8 text-center">
            <p className="text-ape-textMuted">Nessuno qui intorno, per ora. Torna più tardi.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {users.map((u) => (
              <button
                key={u.user_id}
                data-testid={`profile-card-${u.user_id}`}
                onClick={() => navigate(`/profile/${u.user_id}`)}
                className="text-left bg-ape-surface border border-ape-border hover:border-ape-primary/50 rounded-3xl overflow-hidden transition-all hover:-translate-y-1 group"
              >
                <div className="aspect-[4/5] relative overflow-hidden">
                  <img
                    src={u.photo_path ? fileUrl(u.photo_path) : (u.picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=500&fit=crop")}
                    alt={u.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ape-surface via-ape-surface/40 to-transparent" />
                  <div className="absolute top-4 right-4 bg-ape-bg/80 backdrop-blur-md border border-ape-border rounded-full px-3 py-1 flex items-center gap-1 text-xs font-bold">
                    <Clock className="w-3 h-3 text-ape-secondary" /> {u.time_slot || "—"}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="flex items-baseline gap-2 mb-1">
                      <h3 className="font-display font-black text-2xl">{u.name?.split(" ")[0]}</h3>
                      <span className="text-ape-textMuted text-sm">{u.age}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-ape-textMuted">
                      <MapPin className="w-3.5 h-3.5 text-ape-primary" />
                      <span>{u.zone}, {u.city}</span>
                      {u.distance_km != null && <span className="text-ape-secondary">· {u.distance_km}km</span>}
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <span className="text-ape-secondary">{drinkIcon(u.drink)}</span>
                    <span className="font-bold">{u.drink || "—"}</span>
                    <span className="ml-auto text-xs text-ape-textMuted">{u.aperitivi_count || 0} aperitivi</span>
                  </div>
                  {u.bio && <p className="text-sm text-ape-textMuted line-clamp-2">{u.bio}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
