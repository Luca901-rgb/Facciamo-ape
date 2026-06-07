import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Camera, MapPin, Wine, Beer, Martini, GlassWater } from "lucide-react";
import { DRINKS, TIME_SLOTS } from "@/lib/profile";
import CityAutocomplete, { fetchCityNames, isKnownCity } from "@/components/CityAutocomplete";

const drinkIcon = (id) => {
  const map = { Birra: Beer, Vino: Wine, Cocktail: Martini, Analcolico: GlassWater };
  const Icon = map[id] || Martini;
  return <Icon className="w-5 h-5" />;
};

/** Profile completion for Google / magic-link users. */
export default function Onboarding() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const fileRef = useRef(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user?.photo_path ? null : null);
  const [age, setAge] = useState(user?.age || "");
  const [city, setCity] = useState(user?.city || "");
  const [slot, setSlot] = useState(user?.time_slot || "");
  const [drink, setDrink] = useState(user?.drink || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [coords, setCoords] = useState(user?.lat ? { lat: user.lat, lng: user.lng } : null);
  const [loading, setLoading] = useState(false);

  const pickPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

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
    if (!photoFile && !user?.photo_path) return toast.error("Carica una foto profilo");
    if (!age || !city.trim() || !slot || !drink || !bio.trim()) return toast.error("Compila tutti i campi");
    const cityNames = await fetchCityNames();
    if (!isKnownCity(city, cityNames)) {
      return toast.error("Seleziona una città dall'elenco suggerito");
    }
    setLoading(true);
    try {
      let photo_path = user?.photo_path;
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        const up = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        photo_path = up.data.path;
      }
      await api.put("/users/me", {
        age: parseInt(age, 10),
        city: city.trim(),
        time_slot: slot,
        drink,
        bio: bio.trim(),
        photo_path,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      await refresh();
      toast.success("Pronti. Ora si esce. 🍊");
      navigate("/explore", { replace: true });
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
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter mb-3">Completa il profilo</h1>
        <p className="text-ape-textMuted mb-10">Foto e qualche dettaglio, poi entri.</p>

        <form onSubmit={submit} className="space-y-6">
          <div className="flex flex-col items-center">
            <button type="button" onClick={() => fileRef.current?.click()} className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-ape-primary">
                {photoPreview ? (
                  <img src={photoPreview} alt="Anteprima" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-ape-surface flex items-center justify-center text-ape-textMuted text-sm">Foto *</div>
                )}
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" data-testid="onb-photo-input" />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2 block">Età</label>
            <input data-testid="onb-age" type="number" min="18" max="99" value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-ape-surface border border-ape-border focus:border-ape-primary rounded-xl px-4 py-3 outline-none" />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2 block">Città</label>
            <CityAutocomplete
              testId="onb-city"
              value={city}
              onChange={setCity}
              placeholder="Cerca città…"
              inputClassName="w-full bg-ape-surface border border-ape-border focus:border-ape-primary rounded-xl px-4 py-3 outline-none text-ape-text"
            />
          </div>

          <button type="button" data-testid="onb-geo-btn" onClick={detectLocation} className="w-full flex items-center justify-center gap-2 border border-ape-border hover:border-ape-secondary rounded-xl px-4 py-3 text-ape-text font-bold transition-colors">
            <MapPin className="w-4 h-4" />
            {coords ? "Posizione presa ✓" : "Usa la mia posizione"}
          </button>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2 block">Fascia oraria</label>
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((s) => (
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
                <button key={d} type="button" data-testid={`onb-drink-${d}`} onClick={() => setDrink(d)} className={`flex flex-col items-center gap-1 py-3 rounded-2xl border transition-colors ${drink === d ? "bg-ape-primary border-ape-primary text-ape-text" : "bg-ape-surface border-ape-border text-ape-textMuted hover:border-ape-secondary"}`}>
                  {drinkIcon(d)}<span className="text-xs font-bold">{d}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2 block">Bio breve</label>
            <textarea data-testid="onb-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={140} rows={3} placeholder="Una riga su di te. Niente CV." className="w-full bg-ape-surface border border-ape-border focus:border-ape-primary rounded-xl px-4 py-3 outline-none resize-none" />
            <div className="text-right text-xs text-ape-textMuted mt-1">{bio.length}/140</div>
          </div>

          <button data-testid="onb-submit-btn" type="submit" disabled={loading} className="w-full bg-ape-primary hover:bg-ape-primaryHover disabled:opacity-50 text-ape-text font-bold rounded-full px-8 py-4 transition-all shadow-[0_0_25px_rgba(232,93,4,0.4)]">
            {loading ? "..." : "Si parte →"}
          </button>
        </form>
      </div>
    </div>
  );
}
