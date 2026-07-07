"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuoteDetail } from "@/hooks/use-quote-detail";
import { GlassCard } from "@/components/ui/glass-card";
import { LiquidButton } from "@/components/ui/liquid-button";
import { QuoteEditorForm } from "@/components/quotes/quote-editor-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function QuoteEditPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { quote, loading, error } = useQuoteDetail(id);

  if (loading) {
    return (
      <div className="optima-ops-page">
        <div className="optima-ops-container">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48" />
            <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="optima-ops-page">
        <div className="optima-ops-container">
          <GlassCard variant="elevated" padding="lg">
            <p className="text-red-600 dark:text-red-400">
              Errore: {error || "Preventivo non trovato"}
            </p>
            <LiquidButton
              onClick={() => router.push("/preventivi")}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna alla lista
            </LiquidButton>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="optima-ops-page">
      <div className="optima-ops-container space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/preventivi/${id}`}>
              <LiquidButton variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </LiquidButton>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Modifica Preventivo
            </h1>
          </div>
        </div>

        <QuoteEditorForm quote={quote} />
      </div>
    </div>
  );
}
