import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Camera, MapPin, Wine, Beer, Martini, GlassWater } from "lucide-react";
import { DRINKS, TIME_SLOTS } from "@/lib/profile";
import { inputCls, btnPrimaryCls } from "@/pages/AuthShell";
import CityAutocomplete, { fetchCityNames, isKnownCity } from "@/components/CityAutocomplete";

const drinkIcon = (id) => {
  const map = { Birra: Beer, Vino: Wine, Cocktail: Martini, Analcolico: GlassWater };
  const Icon = map[id] || Martini;
  return <Icon className="w-5 h-5" />;
};

export default function Register() {
  const navigate = useNavigate();
  const { completeAuth, refresh } = useAuth();
  const fileRef = useRef(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [slot, setSlot] = useState("");
  const [drink, setDrink] = useState("");
  const [bio, setBio] = useState("");
  const [coords, setCoords] = useState(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photoFile) return toast.error("Carica una foto profilo");
    if (!age || !city.trim() || !slot || !drink || !bio.trim()) {
      return toast.error("Compila tutti i campi del profilo");
    }
    const cityNames = await fetchCityNames();
    if (!isKnownCity(city, cityNames)) {
      return toast.error("Seleziona una città dall'elenco suggerito");
    }
    setLoading(true);
    try {
      const referrer_username = sessionStorage.getItem("ref") || undefined;
      const res = await api.post("/auth/register", { name, email, password, referrer_username });
      sessionStorage.removeItem("ref");
      completeAuth(res.data, res);

      const fd = new FormData();
      fd.append("file", photoFile);
      const up = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });

      await api.put("/users/me", {
        age: parseInt(age, 10),
        city: city.trim(),
        time_slot: slot,
        drink,
        bio: bio.trim(),
        photo_path: up.data.path,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      await refresh();
      toast.success("Account creato! Controlla la email di benvenuto.");
      navigate("/explore", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Registrazione non riuscita");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ape-bg text-ape-text px-6 py-10">
      <div className="max-w-lg mx-auto">
        <Link to="/" className="font-display font-black text-2xl tracking-tighter block mb-8 text-center">
          Facciamo<span className="text-ape-primary">Ape?</span>
        </Link>
        <h1 className="font-display font-black text-3xl tracking-tighter mb-2">Registrati</h1>
        <p className="text-ape-textMuted text-sm mb-8">Tutto in un passaggio: account, foto e profilo.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col items-center">
            <button type="button" onClick={() => fileRef.current?.click()} className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-ape-primary">
                {photoPreview ? (
                  <img src={photoPreview} alt="Anteprima" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-ape-surface flex items-center justify-center text-ape-textMuted text-sm">Foto *</div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6" />
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" data-testid="register-photo-input" />
            <p className="text-xs text-ape-textMuted mt-2">Foto profilo obbligatoria</p>
          </div>

          <input data-testid="register-name-input" type="text" name="name" autoComplete="name" required placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          <input data-testid="register-email-input" type="email" name="email" autoComplete="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          <input data-testid="register-password-input" type="password" name="new-password" autoComplete="new-password" required minLength={8} placeholder="Password (min. 8 caratteri)" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />

          <input data-testid="register-age-input" type="number" min="18" max="99" required placeholder="Età" value={age} onChange={(e) => setAge(e.target.value)} className={inputCls} />
          <CityAutocomplete
            testId="register-city-input"
            value={city}
            onChange={setCity}
            required
            placeholder="Cerca città…"
            inputClassName={inputCls}
          />

          <button type="button" data-testid="register-geo-btn" onClick={detectLocation} className="w-full flex items-center justify-center gap-2 border border-ape-border hover:border-ape-secondary rounded-xl px-4 py-3 font-bold text-sm transition-colors">
            <MapPin className="w-4 h-4" />
            {coords ? "Posizione presa ✓" : "Usa la mia posizione"}
          </button>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2">Fascia oraria</p>
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((s) => (
                <button key={s} type="button" data-testid={`register-slot-${s}`} onClick={() => setSlot(s)} className={`px-4 py-2 rounded-full border font-bold text-sm transition-colors ${slot === s ? "bg-ape-primary border-ape-primary text-ape-text" : "bg-ape-surface border-ape-border text-ape-textMuted hover:border-ape-secondary"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2">Il tuo ordine al bar</p>
            <div className="grid grid-cols-4 gap-2">
              {DRINKS.map((d) => (
                <button key={d} type="button" data-testid={`register-drink-${d}`} onClick={() => setDrink(d)} className={`flex flex-col items-center gap-1 py-3 rounded-2xl border transition-colors ${drink === d ? "bg-ape-primary border-ape-primary text-ape-text" : "bg-ape-surface border-ape-border text-ape-textMuted hover:border-ape-secondary"}`}>
                  {drinkIcon(d)}<span className="text-xs font-bold">{d}</span>
                </button>
              ))}
            </div>
          </div>

          <textarea data-testid="register-bio-input" required maxLength={140} rows={3} placeholder="Bio breve — una riga su di te" value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-ape-bg/60 border border-ape-border focus:border-ape-primary rounded-xl px-4 py-3 outline-none resize-none text-ape-text placeholder:text-ape-textMuted" />
          <div className="text-right text-xs text-ape-textMuted -mt-3">{bio.length}/140</div>

          <button data-testid="register-submit-button" type="submit" disabled={loading} className={btnPrimaryCls}>
            {loading ? "Creazione..." : "Crea account e inizia →"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ape-textMuted">
          Hai già un account? <Link to="/login" className="text-ape-secondary hover:underline">Accedi</Link>
        </p>
      </div>
    </div>
  );
}
