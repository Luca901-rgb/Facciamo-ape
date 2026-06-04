import { useState, useRef } from "react";
import { api, fileUrl } from "@/lib/api";
import Nav from "@/components/Nav";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Camera, Wine, Beer, Martini, GlassWater, MapPin } from "lucide-react";

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
    zone: user?.zone || "",
    time_slot: user?.time_slot || "",
    drink: user?.drink || "",
    bio: user?.bio || "",
    username: user?.username || "",
  });
  const [photoPath, setPhotoPath] = useState(user?.photo_path);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Città">
              <input data-testid="me-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" />
            </Field>
            <Field label="Zona">
              <input data-testid="me-zone" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} className="input" />
            </Field>
          </div>
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

          <button onClick={detectLocation} data-testid="me-geo-btn" className="w-full flex items-center justify-center gap-2 border border-ape-border hover:border-ape-secondary rounded-xl px-4 py-3 font-bold text-sm">
            <MapPin className="w-4 h-4" /> Aggiorna posizione
          </button>

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
