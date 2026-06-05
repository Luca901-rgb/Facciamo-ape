import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fileUrl } from "@/lib/api";
import Nav from "@/components/Nav";
import { useAuth } from "@/App";
import { Wine, Beer, Martini, GlassWater, Clock, MapPin, Navigation } from "lucide-react";

const drinkIcon = (d) => {
  const map = { Birra: Beer, Vino: Wine, "Vino rosso": Wine, "Vino bianco": Wine, Cocktail: Martini, Spritz: Martini, Analcolico: GlassWater };
  const Icon = map[d] || Martini;
  return <Icon className="w-4 h-4" />;
};

const NEAR_ME = "__near_me__";

export default function Explore() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [cities, setCities] = useState([]);
  const [selected, setSelected] = useState(NEAR_ME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/cities").then(({ data }) => {
      setCities(data);
      // Default selection: user's own city if supported, else "near me"
      if (user?.city) {
        const match = data.find((c) => c.name.toLowerCase() === user.city.toLowerCase());
        if (match) setSelected(match.name);
      }
    });
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const params = selected === NEAR_ME ? { radius_km: 5 } : { city: selected, radius_km: 5 };
    api.get("/users/nearby", { params })
      .then(({ data }) => setUsers(data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="min-h-screen bg-ape-bg text-ape-text pb-24 md:pb-12">
      <Nav />
      <main className="px-5 sm:px-12 pt-6 sm:pt-10 max-w-5xl mx-auto">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-ape-secondary font-bold mb-3">Stasera in giro</p>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none">
            Chi c'è <span className="text-ape-primary italic">a 5km</span> da te?
          </h1>
        </div>

        {/* City selector */}
        <div className="mb-8 -mx-5 sm:mx-0 overflow-x-auto hide-scroll">
          <div className="flex gap-2 px-5 sm:px-0 pb-2">
            <button
              data-testid="city-chip-near-me"
              onClick={() => setSelected(NEAR_ME)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border font-bold text-sm transition-colors ${selected === NEAR_ME ? "bg-ape-primary border-ape-primary text-ape-text" : "bg-ape-surface border-ape-border text-ape-textMuted hover:border-ape-secondary"}`}
            >
              <Navigation className="w-3.5 h-3.5" /> Vicino a me
            </button>
            {cities.map((c) => (
              <button
                key={c.name}
                data-testid={`city-chip-${c.name}`}
                onClick={() => setSelected(c.name)}
                className={`shrink-0 px-4 py-2 rounded-full border font-bold text-sm transition-colors ${selected === c.name ? "bg-ape-primary border-ape-primary text-ape-text" : "bg-ape-surface border-ape-border text-ape-textMuted hover:border-ape-secondary"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-ape-textMuted">Cerco compagnia…</div>
        ) : users.length === 0 ? (
          <div className="bg-ape-surface border border-ape-border rounded-2xl p-8 text-center">
            <p className="text-ape-textMuted mb-2">Nessuno qui intorno entro 5km{selected !== NEAR_ME ? ` a ${selected}` : ""}.</p>
            <p className="text-sm text-ape-textMuted/70">Prova un'altra città, o invita un amico.</p>
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
