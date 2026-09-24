"use client"

import type React from "react"
import Image from "next/image"
import { RighelloIcon } from "@/components/brand/righello-icon"
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react"

export const optimaClerkAppearance = {
  variables: {
    colorPrimary: "#D6487E",
    colorBackground: "#050505",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.58)",
    colorInputBackground: "rgba(255,255,255,0.04)",
    colorInputText: "#ffffff",
    borderRadius: "1rem",
    fontFamily: '"Degular Display", sans-serif',
  },
  elements: {
    cardBox: "shadow-none",
    card: "border border-white/[0.09] bg-[#11151f]/92 backdrop-blur-2xl shadow-[0_28px_90px_rgba(0,0,0,0.34)]",
    headerTitle: "text-white font-black",
    headerSubtitle: "text-white/58",
    socialButtonsBlockButton: "h-11 border-white/[0.09] bg-white/[0.035] text-white hover:bg-white/[0.08]",
    formFieldInput: "h-11 border-white/[0.09] bg-white/[0.035] text-white focus:border-[#D6487E]",
    formButtonPrimary: "h-11 rounded-xl bg-[#D6487E] font-bold text-white shadow-[0_14px_40px_rgba(214,72,126,0.24)] hover:bg-[#C03A6E]",
    footerActionLink: "text-[#D6487E] hover:text-[#E85A8F]",
  },
}

export function ClerkAuthShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <main className="optima-app-surface relative min-h-screen overflow-hidden px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
      <div className="pointer-events-none absolute left-[-12rem] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-righello-pink/[0.12] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-14rem] right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-righello-cyan/[0.08] blur-[120px]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-10 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,1fr)_28rem]">
        <section className="hidden lg:block">
          <div className="max-w-[37rem] space-y-8">
            <Image src="/assets/logos/righello-white.png" alt="Righello" width={156} height={42} priority />
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-righello-pink/20 bg-righello-pink/[0.08] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-righello-pink-light">
                <Sparkles className="h-3.5 w-3.5" />
                Óptima workspace
              </div>
              <h1 className="text-6xl font-black leading-[0.91] tracking-[-0.045em]">
                Il lavoro dell&apos;agenzia, finalmente leggibile.
              </h1>
              <p className="max-w-lg text-xl leading-relaxed text-white/56">
                {title} per ritrovare clienti, task, contenuti, ore e decisioni nello stesso spazio operativo.
              </p>
            </div>
            <div className="max-w-lg space-y-2.5">
              {[
                ["Una regia, non dieci strumenti", "Clienti, delivery e persone condividono lo stesso contesto."],
                ["Decisioni più veloci", "Priorità, carico e prossime azioni restano sempre visibili."],
                ["Accesso protetto", "Ruoli e informazioni economiche rispettano il tuo profilo."],
              ].map(([label, body], index) => (
                <div key={label} className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                  {index === 2 ? (
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-righello-cyan" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-righello-pink-light" />
                  )}
                  <div>
                    <p className="text-sm font-black text-white">{label}</p>
                    <p className="mt-0.5 text-sm leading-5 text-white/42">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
            <RighelloIcon className="h-10 w-10 rounded-xl" priority />
            <div>
              <div className="text-xl font-black leading-none">Óptima</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">by Righello</div>
            </div>
          </div>
          {children}
        </section>
      </div>
    </main>
  )
}
