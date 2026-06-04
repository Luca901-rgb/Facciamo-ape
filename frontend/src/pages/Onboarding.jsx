import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Wine, Beer, Martini, GlassWater, MapPin } from "lucide-react";

const DRINKS = [
  { id: "Birra", icon: <Beer className="w-5 h-5" /> },
  { id: "Vino", icon: <Wine className="w-5 h-5" /> },
  { id: "Cocktail", icon: <Martini className="w-5 h-5" /> },
  { id: "Analcolico", icon: <GlassWater className="w-5 h-5" /> },
];
const SLOTS = ["18-19", "19-20", "20-21", "21-22"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [age, setAge] = useState(user?.age || "");
  const [city, setCity] = useState(user?.city || "");
  const [zone, setZone] = useState(user?.zone || "");
  const [slot, setSlot] = useState(user?.time_slot || "");
  const [drink, setDrink] = useState(user?.drink || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(user?.lat ? { lat: user.lat, lng: user.lng } : null);

  const detectLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocalizzazione non disponibile");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Posizione presa 📍");
      },
      () => toast.error("Non riusciamo a prendere la posizione"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!age || !city || !zone || !slot || !drink) return toast.error("Compila tutti i campi");
    setLoading(true);
    try {
      await api.put("/users/me", {
        age: parseInt(age),
        city, zone,
        time_slot: slot,
        drink,
        bio,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      await refresh();
      toast.success("Pronti. Ora si esce. 🍊");
      navigate("/explore");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Errore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ape-bg text-ape-text px-6 py-10 sm:py-16">
      <div className="max-w-xl mx-auto">
        <p className="text-xs uppercase tracking-[0.3em] text-ape-secondary font-bold mb-4">Ultimo passo</p>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter mb-3">Raccontaci di te</h1>
        <p className="text-ape-textMuted mb-10">Bastano i fondamentali. Poi ti facciamo entrare.</p>

        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2 block">Età</label>
            <input data-testid="onb-age" type="number" min="18" max="99" value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-ape-surface border border-ape-border focus:border-ape-primary rounded-xl px-4 py-3 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2 block">Città</label>
              <input data-testid="onb-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Milano" className="w-full bg-ape-surface border border-ape-border focus:border-ape-primary rounded-xl px-4 py-3 outline-none" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2 block">Zona</label>
              <input data-testid="onb-zone" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Navigli" className="w-full bg-ape-surface border border-ape-border focus:border-ape-primary rounded-xl px-4 py-3 outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2 block">Fascia oraria</label>
            <div className="flex flex-wrap gap-2">
              {SLOTS.map((s) => (
                <button key={s} type="button" data-testid={`onb-slot-${s}`} onClick={() => setSlot(s)} className={`px-4 py-2 rounded-full border font-bold text-sm transition-colors ${slot === s ? "bg-ape-primary border-ape-primary text-ape-text" : "bg-ape-surface border-ape-border text-ape-textMuted hover:border-ape-secondary"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2 block">Il tuo ordine al bar</label>
            <div className="grid grid-cols-4 gap-2">
              {DRINKS.map((d) => (
                <button key={d.id} type="button" data-testid={`onb-drink-${d.id}`} onClick={() => setDrink(d.id)} className={`flex flex-col items-center gap-1 py-3 rounded-2xl border transition-colors ${drink === d.id ? "bg-ape-primary border-ape-primary text-ape-text" : "bg-ape-surface border-ape-border text-ape-textMuted hover:border-ape-secondary"}`}>
                  {d.icon}<span className="text-xs font-bold">{d.id}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2 block">Bio breve</label>
            <textarea data-testid="onb-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={140} rows={3} placeholder="Una riga su di te. Niente CV." className="w-full bg-ape-surface border border-ape-border focus:border-ape-primary rounded-xl px-4 py-3 outline-none resize-none" />
            <div className="text-right text-xs text-ape-textMuted mt-1">{bio.length}/140</div>
          </div>

          <button type="button" data-testid="onb-geo-btn" onClick={detectLocation} className="w-full flex items-center justify-center gap-2 border border-ape-border hover:border-ape-secondary rounded-xl px-4 py-3 text-ape-text font-bold transition-colors">
            <MapPin className="w-4 h-4" />
            {coords ? "Posizione presa ✓" : "Usa la mia posizione"}
          </button>

          <button data-testid="onb-submit-btn" type="submit" disabled={loading} className="w-full bg-ape-primary hover:bg-ape-primaryHover disabled:opacity-50 text-ape-text font-bold rounded-full px-8 py-4 transition-all shadow-[0_0_25px_rgba(232,93,4,0.4)]">
            {loading ? "..." : "Si parte →"}
          </button>
        </form>
      </div>
    </div>
  );
}
