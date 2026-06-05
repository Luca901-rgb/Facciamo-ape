import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Wine, Beer, Martini, GlassWater, MapPin, Sparkles } from "lucide-react";

export default function Landing() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refUser, setRefUser] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      sessionStorage.setItem("ref", ref);
      setRefUser(ref);
    } else {
      const stored = sessionStorage.getItem("ref");
      if (stored) setRefUser(stored);
    }
  }, []);

  const handleGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/explore";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleWaitlist = async (e) => {
    e.preventDefault();
    if (!email || !city) return;
    setLoading(true);
    try {
      await api.post("/waitlist", { email, city });
      setSubmitted(true);
      toast.success("Sei nella lista. Ti scriviamo presto. 🍊");
    } catch {
      toast.error("Qualcosa è andato storto. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ape-bg text-ape-text overflow-x-hidden">
      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-20 px-6 sm:px-12 py-6 flex items-center justify-between">
        <div className="font-display font-black text-2xl tracking-tighter">
          Facciamo<span className="text-ape-primary">Ape?</span>
        </div>
        {user ? (
          <a href="/explore" data-testid="nav-app-btn" className="text-sm font-bold text-ape-text border border-ape-border hover:border-ape-secondary rounded-full px-5 py-2 transition-colors">
            Apri l'app →
          </a>
        ) : (
          <button onClick={handleGoogle} data-testid="nav-login-btn" className="text-sm font-bold text-ape-text border border-ape-border hover:border-ape-secondary rounded-full px-5 py-2 transition-colors">
            Entra
          </button>
        )}
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 sm:px-12 pt-32 pb-20">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.pexels.com/photos/20094378/pexels-photo-20094378.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1080&w=1920"
            alt="aperitivo bar"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ape-bg via-ape-bg/40 to-ape-bg" />
          <div className="absolute inset-0 aperol-glow" />
        </div>

        <div className="relative z-10 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ape-surface/60 backdrop-blur-md border border-ape-border mb-8 animate-fade-up">
            <Sparkles className="w-3.5 h-3.5 text-ape-secondary" />
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-ape-textMuted">Solo persone vere · Stasera</span>
          </div>

          <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl leading-[0.9] tracking-tighter animate-fade-up" style={{animationDelay: '0.1s'}}>
            Trova la <span className="text-ape-primary italic">compagnia</span><br/>
            giusta per un<br/>
            <span className="relative inline-block">
              aperitivo
              <span className="absolute -bottom-1 left-0 right-0 h-2 bg-ape-primary/40 -z-10 rounded"></span>
            </span>.
          </h1>

          <p className="mt-8 text-lg sm:text-xl max-w-2xl text-ape-textMuted leading-relaxed animate-fade-up" style={{animationDelay: '0.2s'}}>
            Niente swipe, niente algoritmi misteriosi. Solo gente vicino a te che ha voglia di uscire stasera per un calice — e magari diventare amica.
          </p>

          <div className="mt-12 max-w-xl animate-fade-up" style={{animationDelay: '0.3s'}}>
            {refUser && !submitted && (
              <div data-testid="ref-banner" className="mb-4 inline-flex items-center gap-2 bg-ape-primary/15 border border-ape-primary/40 rounded-full px-4 py-2 text-sm">
                <Sparkles className="w-3.5 h-3.5 text-ape-secondary" />
                <span><span className="font-bold text-ape-secondary">@{refUser}</span> ti ha invitato. Entrate, fate un'ape insieme, e vi appare il badge "Prima volta insieme".</span>
              </div>
            )}
            {submitted ? (
              <div className="bg-ape-surface border border-ape-secondary/40 rounded-2xl p-6">
                <div className="font-display font-bold text-xl mb-1">Ci sei. 🍊</div>
                <p className="text-ape-textMuted text-sm">Ti scriviamo quando apriamo nella tua città. Nel frattempo, accedi e fai un giro.</p>
                <button onClick={handleGoogle} data-testid="cta-google-after-waitlist" className="mt-5 bg-ape-primary hover:bg-ape-primaryHover text-ape-text font-bold rounded-full px-6 py-3 transition-all shadow-[0_0_25px_rgba(232,93,4,0.4)]">
                  Entra con Google
                </button>
              </div>
            ) : (
              <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3">
                <input
                  data-testid="waitlist-email-input"
                  type="email"
                  required
                  placeholder="La tua email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-ape-surface/80 backdrop-blur-md border border-ape-border focus:border-ape-primary focus:ring-1 focus:ring-ape-primary rounded-full px-6 py-4 outline-none placeholder:text-ape-textMuted text-ape-text"
                />
                <input
                  data-testid="waitlist-city-input"
                  type="text"
                  required
                  placeholder="La tua città"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="sm:w-44 bg-ape-surface/80 backdrop-blur-md border border-ape-border focus:border-ape-primary focus:ring-1 focus:ring-ape-primary rounded-full px-6 py-4 outline-none placeholder:text-ape-textMuted text-ape-text"
                />
                <button
                  data-testid="waitlist-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="bg-ape-primary hover:bg-ape-primaryHover text-ape-text font-bold rounded-full px-7 py-4 transition-all shadow-[0_0_25px_rgba(232,93,4,0.4)] hover:shadow-[0_0_40px_rgba(232,93,4,0.7)] hover:-translate-y-0.5"
                >
                  {loading ? "..." : "Voglio entrare"}
                </button>
              </form>
            )}
            <button onClick={handleGoogle} data-testid="cta-google-btn" className="mt-4 text-sm text-ape-textMuted hover:text-ape-secondary underline-offset-4 hover:underline">
              o entra direttamente con Google →
            </button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative px-6 sm:px-12 py-24 sm:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 sm:mb-24">
            <p className="text-xs uppercase tracking-[0.3em] text-ape-secondary font-bold mb-4">Come funziona</p>
            <h2 className="font-display font-black text-4xl sm:text-6xl tracking-tighter leading-[0.95] max-w-3xl">
              Tre passi. <span className="text-ape-textMuted italic font-medium">Non di più.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-12">
            {[
              { n: "01", t: "Esplora i profili vicini", d: "Apri l'app, guardi chi c'è in giro stasera, in che zona, a che ora vuole uscire, cosa beve.", icon: <MapPin className="w-7 h-7" /> },
              { n: "02", t: "Scrivi direttamente", d: "Trovi qualcuno interessante? Mandagli un messaggio. Il primo è gratis. Se accetta, parlate.", icon: <GlassWater className="w-7 h-7" /> },
              { n: "03", t: "Decidete dove andare", d: "Vi mettete d'accordo sul bar, ci aggiungete amici se serve, e via. Niente swipe, niente attese.", icon: <Wine className="w-7 h-7" /> },
            ].map((step, i) => (
              <div key={step.n} className={`relative ${i === 1 ? 'md:mt-16' : i === 2 ? 'md:mt-32' : ''}`}>
                <div className="font-display font-black text-7xl text-ape-primary/30 mb-4">{step.n}</div>
                <div className="text-ape-secondary mb-3">{step.icon}</div>
                <h3 className="font-display font-bold text-2xl mb-3">{step.t}</h3>
                <p className="text-ape-textMuted leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VIBES STRIP */}
      <section className="px-6 sm:px-12 py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { i: <Beer className="w-6 h-6" />, l: "Birra" },
            { i: <Wine className="w-6 h-6" />, l: "Vino" },
            { i: <Martini className="w-6 h-6" />, l: "Cocktail" },
            { i: <GlassWater className="w-6 h-6" />, l: "Analcolico" },
          ].map((x) => (
            <div key={x.l} className="bg-ape-surface border border-ape-border hover:border-ape-primary/40 rounded-2xl p-6 flex flex-col items-center gap-2 transition-colors">
              <div className="text-ape-secondary">{x.i}</div>
              <div className="font-display font-bold text-lg">{x.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="px-6 sm:px-12 py-24 sm:py-32">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs uppercase tracking-[0.3em] text-ape-secondary font-bold mb-6">Il nostro patto</p>
          <h2 className="font-display font-black text-4xl sm:text-6xl tracking-tighter leading-[0.95] mb-12">
            Non è dating.<br/>
            Non è una <s className="text-ape-textMuted/50">startup</s>.<br/>
            È solo <span className="text-ape-primary">aperitivo</span>.
          </h2>
          <div className="space-y-4 text-lg text-ape-textMuted leading-relaxed">
            <p>Abbiamo fatto FacciamoApe? perché eravamo stanchi di passare la serata davanti al telefono. Volevamo qualcosa di semplice: trovare gente vera, vicina, che ha voglia di uscire stasera.</p>
            <p>Il primo messaggio è libero. Se ti rispondono, parlate. Se non vi va, amen — bloccate e via. Niente match, niente cuoricini, niente pressing.</p>
            <p>Aggiungi amici in chat se vuoi farne una piccola comitiva. Decidete il bar voi. Noi vi togliamo di mezzo.</p>
          </div>
          <div className="mt-12">
            <button onClick={handleGoogle} data-testid="cta-final-btn" className="bg-ape-primary hover:bg-ape-primaryHover text-ape-text font-bold rounded-full px-8 py-4 transition-all shadow-[0_0_25px_rgba(232,93,4,0.4)] hover:shadow-[0_0_40px_rgba(232,93,4,0.7)] hover:-translate-y-0.5">
              Facciamolo. Entra ora →
            </button>
          </div>
        </div>
      </section>

      <footer className="px-6 sm:px-12 py-10 border-t border-ape-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-ape-textMuted">
          <div className="font-display font-bold">FacciamoApe? · fatto a Milano, con un calice in mano</div>
          <div>© 2026</div>
        </div>
      </footer>
    </div>
  );
}
