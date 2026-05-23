"use client"

import type React from "react"
import Image from "next/image"

export const optimaClerkAppearance = {
  variables: {
    colorPrimary: "#D6487E",
    colorBackground: "#050505",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.58)",
    colorInputBackground: "rgba(255,255,255,0.04)",
    colorInputText: "#ffffff",
    borderRadius: "0.875rem",
    fontFamily: '"Degular Display", sans-serif',
  },
  elements: {
    cardBox: "shadow-none",
    card: "border border-white/10 bg-white/[0.045] backdrop-blur-xl shadow-2xl",
    headerTitle: "text-white font-black",
    headerSubtitle: "text-white/58",
    socialButtonsBlockButton: "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]",
    formFieldInput: "border-white/10 bg-white/[0.04] text-white focus:border-[#D6487E]",
    formButtonPrimary: "rounded-full bg-[#D6487E] font-bold text-white hover:bg-[#C03A6E]",
    footerActionLink: "text-[#D6487E] hover:text-[#E85A8F]",
  },
}

export function ClerkAuthShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <main className="optima-app-surface min-h-screen px-4 py-8 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_28rem]">
        <section className="hidden lg:block">
          <div className="max-w-xl space-y-8">
            <Image src="/assets/logos/righello-white.png" alt="Righello" width={156} height={42} priority />
            <div className="space-y-5">
              <p className="optima-kicker">Optima access</p>
              <h1 className="text-6xl font-black leading-[0.92]">
                Un solo cockpit per governare lavori, team e clienti.
              </h1>
              <p className="max-w-lg text-xl leading-relaxed text-white/58">
                {title} e rientra nella piattaforma operativa di Righello: attività, ore, preventivi e AI in un sistema unico.
              </p>
            </div>
            <div className="grid max-w-lg grid-cols-3 gap-3">
              {["Stato lavori", "Ore team", "AI ops"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/72">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-righello-pink font-black">O</div>
            <div>
              <div className="text-xl font-black leading-none">Optima</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">by Righello</div>
            </div>
          </div>
          {children}
        </section>
      </div>
    </main>
  )
}
