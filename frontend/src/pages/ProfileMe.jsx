import { useState, useRef, useEffect } from "react";
import { api, fileUrl } from "@/lib/api";
import Nav from "@/components/Nav";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Camera, Wine, Beer, Martini, GlassWater, MapPin, Sparkles, Copy } from "lucide-react";
import CityAutocomplete from "@/components/CityAutocomplete";

const DRINKS = [
  { id: "Birra", icon: <Beer className="w-5 h-5" /> },
  { id: "Vino", icon: <Wine className="w-5 h-5" /> },
  { id: "Cocktail", icon: <Martini className="w-5 h-5" /> },
  { id: "Analcolico", icon: <GlassWater className="w-5 h-5" /> },
];
const SLOTS = ["18-19", "19-20", "20-21", "21-22"];

export default function ProfileMe() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    age: user?.age || "",
    city: user?.city || "",
    time_slot: user?.time_slot || "",
    drink: user?.drink || "",
    bio: user?.bio || "",
    username: user?.username || "",
  });
  const [photoPath, setPhotoPath] = useState(user?.photo_path);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [referral, setReferral] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    api.get("/users/me/referral").then(({ data }) => setReferral(data)).catch(() => {});
  }, []);

  if (!user) return null;

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setPhotoPath(data.path);
      await api.put("/users/me", { photo_path: data.path });
      await refresh();
      toast.success("Foto caricata");
    } catch {
      toast.error("Upload fallito");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/users/me", {
        ...form,
        age: form.age ? parseInt(form.age) : undefined,
      });
      await refresh();
      toast.success("Salvato 🍊");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Errore");
    } finally {
      setSaving(false);
    }
  };

  const detectLocation = () => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await api.put("/users/me", { lat: pos.coords.latitude, lng: pos.coords.longitude });
        await refresh();
        toast.success("Posizione aggiornata 📍");
      },
      () => toast.error("Posizione non disponibile")
    );
  };

  const currentPhoto = photoPath ? fileUrl(photoPath) : (user.picture || null);

  return (
    <div className="min-h-screen bg-ape-bg text-ape-text pb-24 md:pb-12">
      <Nav />
      <main className="max-w-xl mx-auto px-5 sm:px-8 pt-6">
        <h1 className="font-display font-black text-4xl tracking-tighter mb-8">Il tuo profilo</h1>

        <div className="flex flex-col items-center mb-8">
          <button onClick={() => fileRef.current?.click()} data-testid="photo-upload-btn" className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-ape-primary shadow-[0_0_25px_rgba(232,93,4,0.4)]">
              {currentPhoto ? (
                <img src={currentPhoto} alt="me" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-ape-surface flex items-center justify-center text-ape-textMuted">?</div>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-ape-text" />
            </div>
            {uploading && <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center text-sm">...</div>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" data-testid="photo-input" />
          <div className="mt-3 font-display font-bold text-xl">{user.name}</div>
          <div className="text-sm text-ape-textMuted">@{form.username}</div>
          <div className="mt-2 text-sm">
            <span className="font-display font-black text-ape-primary text-xl">{user.aperitivi_count}</span>
            <span className="text-ape-textMuted ml-2">aperitivi fatti</span>
          </div>
        </div>

        <div className="space-y-5">
          <Field label="Username">
            <input data-testid="me-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input" />
          </Field>
          <Field label="Età">
            <input data-testid="me-age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="input" />
          </Field>
          <Field label="Città">
            <CityAutocomplete
              testId="me-city"
              value={form.city}
              onChange={(city) => setForm({ ...form, city })}
              placeholder="Cerca città…"
              inputClassName="input"
            />
          </Field>
          <button onClick={detectLocation} data-testid="me-geo-btn" className="w-full flex items-center justify-center gap-2 border border-ape-border hover:border-ape-secondary rounded-xl px-4 py-3 font-bold text-sm">
            <MapPin className="w-4 h-4" /> Usa la mia posizione
          </button>

          <Field label="Fascia oraria">
            <div className="flex flex-wrap gap-2">
              {SLOTS.map((s) => (
                <button key={s} type="button" data-testid={`me-slot-${s}`} onClick={() => setForm({ ...form, time_slot: s })} className={`px-4 py-2 rounded-full border font-bold text-sm transition-colors ${form.time_slot === s ? "bg-ape-primary border-ape-primary text-ape-text" : "bg-ape-surface border-ape-border text-ape-textMuted hover:border-ape-secondary"}`}>{s}</button>
              ))}
            </div>
          </Field>
          <Field label="Ordine al bar">
            <div className="grid grid-cols-4 gap-2">
              {DRINKS.map((d) => (
                <button key={d.id} type="button" data-testid={`me-drink-${d.id}`} onClick={() => setForm({ ...form, drink: d.id })} className={`flex flex-col items-center gap-1 py-3 rounded-2xl border transition-colors ${form.drink === d.id ? "bg-ape-primary border-ape-primary text-ape-text" : "bg-ape-surface border-ape-border text-ape-textMuted hover:border-ape-secondary"}`}>
                  {d.icon}<span className="text-xs font-bold">{d.id}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Bio">
            <textarea data-testid="me-bio" rows={3} maxLength={140} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="input resize-none" />
          </Field>

          {referral && (
            <div className="bg-ape-surface border border-ape-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-ape-secondary" />
                <h3 className="font-display font-bold text-lg">Porta un amico</h3>
              </div>
              <p className="text-sm text-ape-textMuted mb-4">
                Condividi il link. Quando il tuo amico farà il suo primo aperitivo qui dentro, vi appare il badge <span className="text-ape-secondary font-bold">"Prima volta insieme"</span> sui profili.
              </p>
              <div className="flex gap-2 items-center bg-ape-bg border border-ape-border rounded-xl px-3 py-2.5">
                <span data-testid="referral-link" className="flex-1 text-sm font-mono truncate text-ape-text">{referral.link}</span>
                <button
                  data-testid="referral-copy-btn"
                  onClick={() => { navigator.clipboard.writeText(referral.link); toast.success("Copiato 🍊"); }}
                  className="text-ape-secondary hover:text-ape-primary p-2"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-6 text-sm">
                <div><span className="font-display font-black text-ape-primary text-xl">{referral.invited_count}</span> <span className="text-ape-textMuted">invitati</span></div>
                <div><span className="font-display font-black text-ape-secondary text-xl">{referral.completed_count}</span> <span className="text-ape-textMuted">"prima volta"</span></div>
              </div>
            </div>
          )}

          <button onClick={save} disabled={saving} data-testid="me-save-btn" className="w-full bg-ape-primary hover:bg-ape-primaryHover disabled:opacity-50 text-ape-text font-bold rounded-full px-8 py-4 transition-all shadow-[0_0_25px_rgba(232,93,4,0.4)]">
            {saving ? "..." : "Salva"}
          </button>
        </div>
      </main>

      <style>{`
        .input { width:100%; background:#0D0B0A; border:1px solid #3A302A; border-radius:0.75rem; padding:0.75rem 1rem; outline:none; color:#FDF0D5; }
        .input:focus { border-color:#E85D04; }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted mb-2 block">{label}</label>
      {children}
    </div>
  );
}
