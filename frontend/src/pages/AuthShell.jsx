import { Link } from "react-router-dom";

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-ape-bg text-ape-text flex flex-col items-center justify-center px-6 py-12">
      <Link to="/" className="font-display font-black text-2xl tracking-tighter mb-10">
        Facciamo<span className="text-ape-primary">Ape?</span>
      </Link>
      <div className="w-full max-w-md bg-ape-surface border border-ape-border rounded-2xl p-8">
        <h1 className="font-display font-bold text-2xl mb-1">{title}</h1>
        {subtitle && <p className="text-ape-textMuted text-sm mb-6">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export const inputCls =
  "w-full bg-ape-bg/60 border border-ape-border focus:border-ape-primary focus:ring-1 focus:ring-ape-primary rounded-full px-6 py-3 outline-none placeholder:text-ape-textMuted text-ape-text mb-3";

export const btnPrimaryCls =
  "w-full bg-ape-primary hover:bg-ape-primaryHover text-ape-text font-bold rounded-full px-7 py-3 transition-all shadow-[0_0_25px_rgba(232,93,4,0.4)] disabled:opacity-50";
