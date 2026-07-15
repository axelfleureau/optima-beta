/**
 * Firma visiva del modulo Video Review = quella delle altre pagine operative di
 * Optima (Team, Clienti). Tenute qui in un posto solo per non ri-inventarle a
 * ogni pagina e per non ricadere nello shadcn generico, che stona.
 */

export const pageClass = "optima-ops-page";

export const surfaceClass =
  "border border-white/10 bg-[#172235] text-slate-100 shadow-[0_18px_60px_rgba(2,6,23,0.24)]";

export const mutedSurfaceClass = "border border-white/10 bg-[#111b2d] text-slate-100";

/** Card cliccabile: stessa superficie + accento del brand all'hover. */
export const interactiveSurfaceClass = `${surfaceClass} transition-all duration-300 hover:border-righello-pink/35`;

/** Input con icona a sinistra (pl-10), come la ricerca di Team/Clienti. */
export const inputClass =
  "h-11 border-white/10 bg-[#172235] pl-10 text-slate-100 placeholder:text-slate-500 shadow-none outline-none focus-visible:border-righello-pink/70 focus-visible:ring-righello-pink/20";

/** Input senza icona. */
export const plainInputClass = inputClass.replace("pl-10 ", "");

export const primaryButtonClass =
  "bg-righello-pink hover:bg-righello-pink-dark text-white shadow-corporate-medium";

export const h1Class = "text-2xl md:text-4xl font-bold text-white flex items-center gap-3 md:gap-4";

export const subtitleClass = "text-slate-400";

/** Colori di stato dei video: usati in badge e riepiloghi. */
export const STATUS_META: Record<string, { label: string; badge: string; dot: string }> = {
  pending: {
    label: "In attesa cliente",
    badge: "border-white/10 bg-white/5 text-slate-300",
    dot: "bg-slate-400",
  },
  revision: {
    label: "Da revisionare",
    badge: "border-amber-500/20 bg-amber-500/15 text-amber-300",
    dot: "bg-amber-400",
  },
  approved: {
    label: "Approvato",
    badge: "border-emerald-500/20 bg-emerald-500/15 text-emerald-300",
    dot: "bg-emerald-400",
  },
  uploading: {
    label: "In caricamento",
    badge: "border-white/10 bg-white/5 text-slate-400",
    dot: "bg-slate-500",
  },
};

export function statusMeta(status?: string | null) {
  return STATUS_META[String(status || "pending")] || STATUS_META.pending;
}

/** Cappelli dei collaboratori (non sono ruoli permanenti: valgono per la tranche/video). */
export const COLLAB_ROLE_META: Record<string, { label: string; className: string }> = {
  videomaker: { label: "Videomaker", className: "border-righello-pink/30 bg-righello-pink/15 text-righello-pink" },
  smm: { label: "SMM", className: "border-cyan-500/25 bg-cyan-500/15 text-cyan-300" },
  revisore: { label: "Revisore", className: "border-amber-500/25 bg-amber-500/15 text-amber-300" },
  osservatore: { label: "Osservatore", className: "border-white/10 bg-white/5 text-slate-300" },
};

export function initials(name?: string | null) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}
