import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fileUrl } from "@/lib/api";
import Nav from "@/components/Nav";
import { useAuth } from "@/App";
import { isSuperAdmin } from "@/lib/admin";
import { toast } from "sonner";
import { Shield, RotateCcw, Ban, CheckCircle, AlertTriangle, Users, Trash2 } from "lucide-react";

const REASON_LABELS = {
  spam: "Spam",
  contenuto_inappropriato: "Contenuto inappropriato",
  molestie: "Molestie",
  profilo_falso: "Profilo falso",
  altro: "Altro",
};

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState("users");
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("open");

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/reports?status=${status}`);
      setGroups(data);
    } catch (e) {
      if (e.response?.status === 403) {
        toast.error("Accesso riservato");
        navigate("/explore");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setMembers(data.users || []);
      setMemberTotal(data.total || 0);
    } catch (e) {
      if (e.response?.status === 403) {
        toast.error("Accesso riservato");
        navigate("/explore");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !isSuperAdmin(user)) {
      navigate("/explore");
      return;
    }
    if (tab === "users") loadUsers();
    else loadReports();
  }, [user, tab, status]);

  const unsuspend = async (uid, name) => {
    if (!confirm(`Riabilitare ${name}?`)) return;
    await api.post(`/admin/users/${uid}/unsuspend`);
    toast.success("Utente riabilitato");
    loadReports();
  };

  const suspend = async (uid, name) => {
    if (!confirm(`Sospendere ${name}?`)) return;
    await api.post(`/admin/users/${uid}/suspend`);
    toast.success("Utente sospeso");
    loadReports();
  };

  const resolveReport = async (rid) => {
    await api.post(`/admin/reports/${rid}/resolve`);
    toast.success("Segnalazione risolta");
    loadReports();
  };

  const removeUser = async (uid, name, email) => {
    if (!confirm(`Eliminare definitivamente ${name} (${email})?`)) return;
    try {
      await api.delete(`/admin/users/${uid}`);
      toast.success("Utente eliminato");
      loadUsers();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Eliminazione non riuscita");
    }
  };

  if (!isSuperAdmin(user)) return null;

  return (
    <div className="min-h-screen bg-ape-bg text-ape-text pb-24 md:pb-12">
      <Nav />
      <main className="max-w-5xl mx-auto px-5 sm:px-8 pt-6">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-7 h-7 text-ape-primary" />
          <div>
            <h1 className="font-display font-black text-4xl tracking-tighter">Admin</h1>
            <p className="text-sm text-ape-textMuted">Accesso riservato · {user.email}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            data-testid="admin-tab-users"
            onClick={() => setTab("users")}
            className={`px-5 py-2 rounded-full font-bold text-sm transition-colors flex items-center gap-2 ${tab === "users" ? "bg-ape-primary text-ape-text" : "bg-ape-surface border border-ape-border text-ape-textMuted hover:border-ape-secondary"}`}
          >
            <Users className="w-4 h-4" /> Iscritti ({memberTotal || "…"})
          </button>
          <button
            data-testid="admin-tab-reports"
            onClick={() => setTab("reports")}
            className={`px-5 py-2 rounded-full font-bold text-sm transition-colors ${tab === "reports" ? "bg-ape-primary text-ape-text" : "bg-ape-surface border border-ape-border text-ape-textMuted hover:border-ape-secondary"}`}
          >
            Moderazione
          </button>
        </div>

        {tab === "users" ? (
          loading ? (
            <div className="text-ape-textMuted">Caricamento iscritti…</div>
          ) : members.length === 0 ? (
            <div className="bg-ape-surface border border-ape-border rounded-2xl p-8 text-center text-ape-textMuted">
              Nessun iscritto trovato.
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((u) => {
                const avatar = u.photo_path ? fileUrl(u.photo_path) : u.picture;
                return (
                  <div key={u.user_id} data-testid={`admin-user-${u.user_id}`} className="bg-ape-surface border border-ape-border rounded-2xl p-4 flex items-center gap-4">
                    <img
                      src={avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop"}
                      alt={u.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold truncate">{u.name || "—"}</div>
                      <div className="text-xs text-ape-textMuted truncate">{u.email}</div>
                      <div className="text-xs text-ape-secondary mt-1">
                        @{u.username}
                        {u.city ? ` · ${u.city}` : ""}
                        {u.created_at ? ` · ${new Date(u.created_at).toLocaleDateString("it-IT")}` : ""}
                      </div>
                    </div>
                    {u.email?.toLowerCase() !== user.email?.toLowerCase() && (
                      <button
                        data-testid={`admin-delete-${u.user_id}`}
                        onClick={() => removeUser(u.user_id, u.name, u.email)}
                        className="text-red-400 hover:text-red-300 p-2"
                        title="Elimina utente"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <>
            <div className="flex gap-2 mb-6">
              {["open", "resolved"].map((s) => (
                <button
                  key={s}
                  data-testid={`admin-tab-${s}`}
                  onClick={() => setStatus(s)}
                  className={`px-5 py-2 rounded-full font-bold text-sm transition-colors ${status === s ? "bg-ape-primary text-ape-text" : "bg-ape-surface border border-ape-border text-ape-textMuted hover:border-ape-secondary"}`}
                >
                  {s === "open" ? "Aperte" : "Risolte"}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-ape-textMuted">Caricamento…</div>
            ) : groups.length === 0 ? (
              <div className="bg-ape-surface border border-ape-border rounded-2xl p-8 text-center text-ape-textMuted">
                Nessuna segnalazione {status === "open" ? "aperta" : "risolta"}.
              </div>
            ) : (
              <div className="space-y-4">
                {groups.map((g) => {
                  const u = g.reported_user || {};
                  const avatar = u.photo_path ? fileUrl(u.photo_path) : u.picture;
                  return (
                    <div key={u.user_id} data-testid={`admin-group-${u.user_id}`} className="bg-ape-surface border border-ape-border rounded-3xl p-5">
                      <div className="flex items-center gap-4 mb-4">
                        <img src={avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop"} className="w-14 h-14 rounded-full object-cover" alt={u.name} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-display font-bold text-lg">{u.name || "—"}</div>
                            {u.is_suspended && (
                              <span className="text-[10px] uppercase tracking-wider bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> sospeso
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-ape-textMuted truncate">@{u.username} · {u.email}</div>
                          <div className="text-xs text-ape-secondary font-bold mt-1">{g.report_count} segnalazioni</div>
                        </div>
                        <div className="flex gap-2">
                          {u.is_suspended ? (
                            <button data-testid={`admin-unsuspend-${u.user_id}`} onClick={() => unsuspend(u.user_id, u.name)} className="bg-ape-secondary hover:bg-ape-primary text-ape-bg font-bold rounded-full px-4 py-2 text-sm flex items-center gap-1">
                              <RotateCcw className="w-4 h-4" /> Riabilita
                            </button>
                          ) : (
                            <button data-testid={`admin-suspend-${u.user_id}`} onClick={() => suspend(u.user_id, u.name)} className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-full px-4 py-2 text-sm flex items-center gap-1">
                              <Ban className="w-4 h-4" /> Sospendi
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {g.reports.map((r) => (
                          <div key={r.id} className="flex items-start gap-3 bg-ape-bg/60 border border-ape-border rounded-2xl px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs uppercase tracking-wider font-bold text-ape-secondary">{REASON_LABELS[r.reason] || r.reason}</span>
                                <span className="text-xs text-ape-textMuted">·</span>
                                <span className="text-xs text-ape-textMuted">{r.reporter?.name || "anonimo"}</span>
                              </div>
                              {r.detail && <p className="text-sm text-ape-text">{r.detail}</p>}
                              <div className="text-[10px] text-ape-textMuted mt-1">{new Date(r.created_at).toLocaleString("it-IT")}</div>
                            </div>
                            {r.status === "open" && (
                              <button data-testid={`admin-resolve-${r.id}`} onClick={() => resolveReport(r.id)} className="text-ape-textMuted hover:text-ape-secondary p-2" title="Risolvi">
                                <CheckCircle className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
