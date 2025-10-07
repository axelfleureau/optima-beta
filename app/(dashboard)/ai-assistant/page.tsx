"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Loader2, Sparkles } from "lucide-react";

// Loading component
function AIAssistantLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-12">
        <div className="flex items-center justify-center h-96">
          <div className="text-cent 16 bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-3">
              <Sparkles className="h-6 w-6 text-pink-500" />
              Assistente AI
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Caricamento in corso...</p>
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
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Errore di Caricamento</h2>
              <p className="text-gray-600">Impossibile caricare l&apos;assistente AI. Riprova più tardi.</p>
            </div>
          </div>
        ),
      };
    }),
  {
    ssr: false,
    loading: AIAssistantLoading,
  }
);

export default function AIAssistantPage() {
  return (
    <Suspense fallback={<AIAssistantLoading />}>
      <AIAssistantClient />
    </Suspense>
  );
}
