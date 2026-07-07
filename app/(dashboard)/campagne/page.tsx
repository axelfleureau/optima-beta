"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Facebook,
  Gauge,
  Globe2,
  Layers3,
  LineChart,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

type Integration = {
  name: string;
  provider: "Meta" | "Google";
  description: string;
  status: "ready" | "planned";
  scopes: string[];
  icon: typeof Facebook;
};

const integrations: Integration[] = [
  {
    name: "Meta Ads",
    provider: "Meta",
    description:
      "Campagne Facebook e Instagram, budget, creatività, performance e breakdown per cliente.",
    status: "planned",
    scopes: ["ads_read", "business_management", "pages_read_engagement"],
    icon: Facebook,
  },
  {
    name: "Google Ads",
    provider: "Google",
    description:
      "Search, Performance Max, campagne video, costo, conversioni e stato annunci.",
    status: "planned",
    scopes: ["Google Ads API", "OAuth account manager", "refresh token"],
    icon: Search,
  },
  {
    name: "GA4",
    provider: "Google",
    description:
      "Eventi, conversioni, sorgenti traffico e qualità landing collegate ai progetti.",
    status: "planned",
    scopes: ["Analytics Data API", "property read"],
    icon: LineChart,
  },
  {
    name: "Search Console",
    provider: "Google",
    description:
      "Query, pagine, CTR organico e segnali SEO agganciati alle attività di contenuto.",
    status: "planned",
    scopes: ["webmasters.readonly"],
    icon: Globe2,
  },
];

const operatingFlow = [
  {
    title: "Connetti account",
    text: "OAuth Meta/Google, selezione account pubblicitari e proprietà analytics per cliente.",
  },
  {
    title: "Mappa cliente e progetto",
    text: "Ogni campagna esterna deve finire dentro cliente, progetto, task e owner Óptima.",
  },
  {
    title: "Sincronizza performance",
    text: "Budget, spesa, reach, lead, conversioni e anomalie entrano nel controllo aziendale.",
  },
  {
    title: "Azioni operative",
    text: "Óptima propone task: refresh creatività, stop campagne inefficienti, follow-up lead.",
  },
];

const nextBuildSteps = [
  "Vault sicuro per token OAuth e refresh token provider.",
  "Tabelle D1 per account, campagne, ad set, ads, metriche giornaliere e mapping cliente/progetto.",
  "Worker cron per sync incrementale e normalizzazione KPI cross-provider.",
  "Dashboard per ROAS, CPL, spend pacing, anomalie e task automatiche.",
];

function statusBadge(status: Integration["status"]) {
  if (status === "ready") {
    return (
      <Badge className="rounded-md border border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/10">
        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
        Pronto
      </Badge>
    );
  }

  return (
    <Badge className="rounded-md border border-pink-400/30 bg-pink-400/10 text-pink-100 hover:bg-pink-400/10">
      <CircleDashed className="mr-1.5 h-3.5 w-3.5" />
      Da collegare
    </Badge>
  );
}

export default function CampagnePage() {
  return (
    <div className="optima-ops-page">
      <div className="optima-ops-container optima-ops-stack">
        <section className="overflow-hidden rounded-lg border border-white/10 bg-[#080d18]/90">
          <div className="grid gap-8 p-5 md:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
            <div className="flex flex-col justify-between gap-8">
              <div className="space-y-5">
                <Badge className="w-fit rounded-md border border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/10">
                  Campaign Ops
                </Badge>
                <div className="space-y-4">
                  <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-normal md:text-5xl">
                    Campagne ha senso quando legge Meta, Google e analytics.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                    Qui non vogliamo un CRM campagne finto. La pagina deve
                    diventare il ponte tra advertising, performance e task
                    operative: spesa, risultati, owner, ritardi, creatività e
                    prossime azioni.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <Megaphone className="mb-3 h-5 w-5 text-pink-300" />
                  <p className="text-2xl font-black">0</p>
                  <p className="text-xs text-slate-400">account collegati</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <Gauge className="mb-3 h-5 w-5 text-cyan-300" />
                  <p className="text-2xl font-black">0%</p>
                  <p className="text-xs text-slate-400">dati live provider</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <Zap className="mb-3 h-5 w-5 text-emerald-300" />
                  <p className="text-2xl font-black">4</p>
                  <p className="text-xs text-slate-400">
                    integrazioni prioritarie
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-4 md:p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">
                    Readiness integrazioni
                  </p>
                  <p className="text-xs text-slate-400">
                    Nessuna campagna live finche non colleghiamo i provider.
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="space-y-3">
                {integrations.map((integration) => {
                  const Icon = integration.icon;
                  return (
                    <div
                      key={integration.name}
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06]">
                            <Icon className="h-5 w-5 text-white" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-white">
                              {integration.name}
                            </p>
                            <p className="mt-1 text-sm leading-5 text-slate-400">
                              {integration.description}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {statusBadge(integration.status)}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {integration.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="rounded-md border border-white/10 bg-black/30 px-2.5 py-1 text-xs text-slate-300"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-lg border-white/10 bg-[#090d19] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Layers3 className="h-5 w-5 text-pink-300" />
                Flusso corretto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {operatingFlow.map((step, index) => (
                <div
                  key={step.title}
                  className="grid grid-cols-[32px_1fr] gap-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-sm font-black text-cyan-100">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-bold text-white">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-white/10 bg-[#090d19] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <BarChart3 className="h-5 w-5 text-cyan-300" />
                Cosa deve misurare Óptima
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  [
                    "Spend pacing",
                    "Budget consumato vs piano e finestra temporale.",
                  ],
                  [
                    "CPL / CPA",
                    "Costo per lead o conversione per cliente e progetto.",
                  ],
                  [
                    "Creatività stanche",
                    "Frequenza alta, CTR in calo, task refresh automatiche.",
                  ],
                  [
                    "Lead follow-up",
                    "Campagna genera lead ma manca task commerciale.",
                  ],
                  [
                    "ROAS / margine",
                    "Risultato media collegato a preventivi e valore cliente.",
                  ],
                  [
                    "Anomalie",
                    "Picchi di spesa, campagne ferme, tracking assente.",
                  ],
                ].map(([title, text]) => (
                  <div
                    key={title}
                    className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                  >
                    <p className="font-bold text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <Card className="rounded-lg border-white/10 bg-[#090d19] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Sparkles className="h-5 w-5 text-pink-300" />
                Build plan integrazione
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {nextBuildSteps.map((step) => (
                <div
                  key={step}
                  className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-slate-300"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{step}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-pink-400/20 bg-[linear-gradient(145deg,rgba(236,72,153,0.15),rgba(34,211,238,0.08))] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Target className="h-5 w-5 text-pink-300" />
                Decisione prodotto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-slate-300">
                Fino a quando Meta e Google non sono collegati, questa pagina
                deve essere una cabina di regia delle integrazioni, non una
                lista manuale di campagne.
              </p>
              <div className="grid gap-2">
                <Button className="h-10 rounded-md bg-pink-500 text-white hover:bg-pink-400">
                  Prossimo step: OAuth provider
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-md border-white/15 bg-white/[0.03] text-white hover:bg-white/10"
                >
                  Apri documentazione integrazioni
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
