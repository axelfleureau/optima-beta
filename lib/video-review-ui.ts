/**
 * Firma visiva del modulo Video Review = quella delle altre pagine operative di
 * Optima (Team, Clienti). Tenute qui in un posto solo per non ri-inventarle a
 * ogni pagina e per non ricadere nello shadcn generico, che stona.
 */

/**
 * Struttura canonica delle pagine operative di Optima (clienti, campagne,
 * workspace, presenze…):
 *
 *   <div className={pageClass}>            ← sfondo/altezza pagina
 *     <div className={containerClass}>     ← max 80rem, centrato  ⟵ SENZA questo
 *       <div className={stackClass}>          il contenuto si spalma su tutta
 *         …header, toolbar, card…            la larghezza
 *
 * NB: in globals.css esistono anche .optima-ops-surface/-title/-eyebrow ma
 * NESSUNA pagina le usa: per superfici e titoli la convenzione reale è Tailwind
 * a mano (vedi surfaceClass/h1Class qui sotto, presi da Team e Clienti).
 */
export const pageClass = "optima-ops-page";
export const containerClass = "optima-ops-container";
export const stackClass = "optima-ops-stack md:gap-8";

/**
 * Superficie = quella di Controllo Aziendale/Dashboard (le pagine "premium"
 * mostrate come riferimento): rounded-lg, bg #121b2b, ombra profonda.
 */
export const surfaceClass =
  "rounded-lg border border-white/10 bg-[#121b2b] text-slate-100 shadow-[0_18px_70px_rgba(2,6,23,0.24)]";

/** Pannello "incassato" (dentro una card), più scuro. */
export const insetPanelClass = "rounded-lg border border-white/10 bg-[#0e1625] text-slate-100";

export const mutedSurfaceClass = "rounded-lg border border-white/10 bg-[#111b2d] text-slate-100";

/** Card cliccabile: stessa superficie + accento del brand all'hover. */
export const interactiveSurfaceClass = `${surfaceClass} transition-all duration-300 hover:border-righello-pink/35`;

/** Input con icona a sinistra (pl-10). */
export const inputClass =
  "h-11 rounded-lg border-white/10 bg-[#172235] pl-10 text-slate-100 placeholder:text-slate-500 shadow-none outline-none focus-visible:border-righello-pink/70 focus-visible:ring-righello-pink/20";

/** Input senza icona. */
export const plainInputClass = inputClass.replace("pl-10 ", "");

export const primaryButtonClass =
  "bg-righello-pink hover:bg-righello-pink-dark text-white shadow-corporate-medium";

/** Titolo pagina: come Controllo Aziendale (font-black, cresce su md). */
export const h1Class = "text-3xl md:text-4xl font-black tracking-normal text-white";

/** Titolo di sezione dentro una pagina. */
export const sectionTitleClass = "text-xl font-bold text-white";

export const subtitleClass = "mt-2 max-w-3xl text-sm leading-6 text-slate-400 md:text-base";

/** Quadrato con icona brand sopra il titolo (pattern header di Optima). */
export const headerIconClass =
  "mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-righello-pink/15 text-righello-pink";

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
