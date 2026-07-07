"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Loader2, Sparkles } from "lucide-react";

// Loading component
function AIAssistantLoading() {
  return (
    <div className="optima-ops-page">
      <div className="optima-ops-container">
        <div className="flex items-center justify-center h-96">
          <div className="text-center w-16 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center mx-auto shadow-lg">
            <Loader2 className="h-8 w-8 text-righello-pink animate-spin" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
              <Sparkles className="h-6 w-6 text-righello-pink" />
              Assistente AI
            </h1>
            <p className="text-slate-400">Caricamento in corso...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Completely disable SSR for the entire AI Assistant page
const AIAssistantClient = dynamic(
  () =>
    import("./ai-assistant-client").catch(() => {
      // Fallback in case of import error
      return {
        default: () => (
          <div className="optima-ops-page flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">
                Errore di Caricamento
              </h2>
              <p className="text-slate-400">
                Impossibile caricare l&apos;assistente AI. Riprova più tardi.
              </p>
            </div>
          </div>
        ),
      };
    }),
  {
    ssr: false,
    loading: AIAssistantLoading,
  },
);

export default function AIAssistantPage() {
  return (
    <Suspense fallback={<AIAssistantLoading />}>
      <AIAssistantClient />
    </Suspense>
  );
}
