"use client";

import type { LucideIcon } from "lucide-react";
import {
  headerIconClass,
  h1Class,
  subtitleClass,
  surfaceClass,
} from "@/lib/video-review-ui";
import { cn } from "@/lib/utils";

/**
 * Testata di pagina identica a Controllo Aziendale/Dashboard:
 * quadrato con icona brand SOPRA il titolo, titolo font-black, subtitle slate.
 * Un solo componente per tutte le pagine del modulo → gerarchia coerente.
 */
export function VrPageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  back,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  back?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        {back}
        <div className={headerIconClass}>
          <Icon className="h-6 w-6" />
        </div>
        <h1 className={h1Class}>{title}</h1>
        {subtitle && <p className={subtitleClass}>{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Stat card identica a quella di Controllo Aziendale: label in alto a sinistra,
 * numero grande font-black, dettaglio sotto, icona in alto a destra colorata.
 */
export function VrStatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "text-white",
  iconTone = "text-slate-500",
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  detail?: string;
  tone?: string;
  iconTone?: string;
}) {
  return (
    <div className={cn(surfaceClass, "p-5")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-300">{label}</p>
          <p className={cn("mt-4 text-3xl font-black", tone)}>{value}</p>
          {detail && <p className="mt-2 text-xs text-slate-400">{detail}</p>}
        </div>
        <Icon className={cn("h-5 w-5 shrink-0", iconTone)} />
      </div>
    </div>
  );
}
