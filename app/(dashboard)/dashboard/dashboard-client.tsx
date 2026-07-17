"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Target,
  FileText,
  CheckCircle,
  Clock,
  DollarSign,
  Brain,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useAuth } from "@/lib/auth-context";
import { TokenUsageWidget } from "@/components/dashboard/token-usage-widget";
import { StaffPremiereGuide } from "@/components/staff-premiere-guide";

// Lazy load Technical Architect Dialog - reduces initial bundle size
const TechnicalArchitectDialog = dynamic(
  () =>
    import("@/components/architect/technical-architect-dialog").then((mod) => ({
      default: mod.TechnicalArchitectDialog,
    })),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
          <div className="animate-spin h-12 w-12 border-4 border-slate-600 dark:border-slate-400 border-t-transparent rounded-full" />
          <p className="text-lg font-medium text-gray-900 dark:text-white animate-pulse">
            Caricamento...
          </p>
        </div>
      </div>
    ),
    ssr: false,
  },
);

// Lazy load Dashboard Command Input - reduces initial bundle (uses framer-motion, complex orchestration)
const DashboardCommandInput = dynamic(
  () =>
    import("@/components/dashboard/dashboard-command-input").then((mod) => ({
      default: mod.DashboardCommandInput,
    })),
  {
    loading: () => (
      <div className="optima-panel relative rounded-[1.5rem] p-6 md:p-8">
        <div className="flex items-center justify-center h-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-righello-pink border-t-transparent" />
        </div>
      </div>
    ),
    ssr: false,
  },
);

const dashboardPageClass = "optima-ops-page";

export function DashboardClient() {
  const { userData } = useAuth();
  const { stats, recentActivities, loading } = useDashboardData();

  if (loading) {
    return (
      <div className={dashboardPageClass}>
        <div className="optima-ops-container">
          <div className="space-y-6 md:space-y-8 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-righello-pink/20"></div>
              <div className="space-y-2">
                <div className="h-8 w-64 rounded bg-white/10"></div>
                <div className="h-4 w-48 rounded bg-white/10"></div>
              </div>
            </div>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 rounded-2xl border border-white/10 bg-white/[0.04]"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tokenUsagePercentage =
    stats.aiTokensLimit > 0
      ? Math.min((stats.aiTokensUsed / stats.aiTokensLimit) * 100, 100)
      : 0;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "ai_usage":
        return <Brain className="h-4 w-4 text-righello-pink" />;
      case "task":
        return <CheckCircle className="h-4 w-4 text-righello-cyan" />;
      case "campaign":
        return <Target className="h-4 w-4 text-righello-pink" />;
      case "quote":
        return <FileText className="h-4 w-4 text-righello-cyan" />;
      case "client":
        return <Users className="h-4 w-4 text-righello-pink" />;
      default:
        return <Clock className="h-4 w-4 text-white/50" />;
    }
  };

  const getStatusBadge = (type: string, status?: string) => {
    if (!status) return null;

    const getStatusColor = (status: string) => {
      switch (status) {
        case "completed":
        case "accepted":
          return "bg-righello-cyan/10 text-righello-cyan";
        case "active":
        case "running":
        case "in_progress":
          return "bg-righello-pink/10 text-righello-pink";
        case "pending":
        case "sent":
          return "bg-white/8 text-white/70";
        case "rejected":
          return "bg-red-500/10 text-red-300";
        default:
          return "bg-white/8 text-white/70";
      }
    };

    return (
      <Badge
        variant="secondary"
        className={`text-xs ${getStatusColor(status)} border-0`}
      >
        {status}
      </Badge>
    );
  };

  return (
    <div className={dashboardPageClass}>
      <div className="optima-ops-container">
        <div className="optima-ops-stack md:gap-8">
          {/* Header Section */}
          <div className="optima-panel overflow-hidden rounded-[1.75rem] p-5 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3">
                <div className="optima-kicker">Optima by Righello</div>
                <h1 className="flex items-center gap-3 text-3xl font-black leading-[0.98] text-slate-950 dark:text-white md:text-5xl">
                  <div className="optima-icon-tile flex h-12 w-12 items-center justify-center rounded-2xl md:h-14 md:w-14">
                    <Sparkles className="h-6 w-6 md:h-7 md:w-7" />
                  </div>
                  <span>Benvenuto, {userData?.firstName || "Utente"}.</span>
                </h1>
                <p className="max-w-2xl text-base text-slate-600 dark:text-white/58 md:text-lg">
                  Cockpit operativo per stato lavori, clienti, preventivi, team
                  e AI. {userData?.companyName} - Piano{" "}
                  {userData?.plan || "Base"}.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:flex">
                <div className="optima-pill px-4 py-2 text-sm font-semibold">
                  {stats.pendingTasks} task aperti
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-700 dark:text-white/70">
                  {Math.round(tokenUsagePercentage)}% AI
                </div>
              </div>
            </div>
          </div>

          <StaffPremiereGuide />

          {/* Command Bar Glassmorphic Section */}
          <div className="optima-panel relative rounded-[1.5rem] p-5 md:p-8">
            <DashboardCommandInput />
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="optima-glass-card overflow-hidden rounded-2xl border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-white/70">
                  <Users className="h-5 w-5 text-righello-pink" />
                  Clienti Totali
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-4xl font-black righello-text-gradient">
                  {stats.totalClients}
                </div>
                <p className="text-xs text-slate-500 dark:text-white/40">
                  clienti attivi
                </p>
              </CardContent>
            </Card>

            <Card className="optima-glass-card overflow-hidden rounded-2xl border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-white/70">
                  <Target className="h-5 w-5 text-righello-cyan" />
                  Campagne Attive
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-4xl font-black text-righello-cyan">
                  {stats.activeCampaigns}
                </div>
                <p className="text-xs text-slate-500 dark:text-white/40">
                  in corso
                </p>
              </CardContent>
            </Card>

            <Card className="optima-glass-card overflow-hidden rounded-2xl border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-white/70">
                  <FileText className="h-5 w-5 text-righello-pink" />
                  Preventivi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-4xl font-black text-righello-pink">
                  {stats.sentQuotes}
                </div>
                <p className="text-xs text-slate-500 dark:text-white/40">
                  in archivio
                </p>
              </CardContent>
            </Card>

            <Card className="optima-glass-card overflow-hidden rounded-2xl border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-white/70">
                  <CheckCircle className="h-5 w-5 text-righello-cyan" />
                  Task Completati
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-4xl font-black righello-text-gradient">
                  {stats.completedTasks}
                </div>
                <p className="text-xs text-slate-500 dark:text-white/40">
                  questo mese
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <Card className="optima-glass-card overflow-hidden rounded-2xl border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-white/70">
                  <Clock className="h-5 w-5 text-righello-pink" />
                  Task Pendenti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-4xl font-black text-righello-pink">
                  {stats.pendingTasks}
                </div>
                <p className="text-xs text-slate-500 dark:text-white/40">
                  da completare
                </p>
              </CardContent>
            </Card>

            <Card className="optima-glass-card overflow-hidden rounded-2xl border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-white/70">
                  <DollarSign className="h-5 w-5 text-righello-cyan" />
                  Fatturato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-4xl font-black text-righello-cyan">
                  €{stats.totalRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 dark:text-white/40">
                  preventivi accettati
                </p>
              </CardContent>
            </Card>

            <TokenUsageWidget />
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
            <Card className="optima-glass-card lg:col-span-4 overflow-hidden rounded-2xl border-0">
              <CardHeader className="border-b border-slate-200/60 bg-white/40 dark:border-white/10 dark:bg-white/[0.03]">
                <CardTitle className="flex items-center gap-3 text-slate-950 dark:text-white">
                  <div className="optima-icon-tile rounded-xl p-2">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  Attività Recenti
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                {recentActivities.length > 0 ? (
                  <div className="space-y-3 md:space-y-4">
                    {recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-3 rounded-xl border border-slate-200/60 p-3 transition-all duration-200 hover:border-righello-pink/30 hover:bg-righello-pink/[0.04] dark:border-white/10 dark:hover:bg-white/[0.04] md:space-x-4 md:p-4"
                      >
                        <div className="mt-1 rounded-lg bg-slate-100 p-2 dark:bg-white/[0.05]">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-950 dark:text-white">
                              {activity.title}
                            </p>
                            {getStatusBadge(activity.type, activity.status)}
                          </div>
                          {activity.details && (
                            <p className="mt-1 truncate text-xs text-slate-600 dark:text-white/50">
                              {activity.details}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/40">
                              <span>
                                {activity.timestamp?.toLocaleDateString(
                                  "it-IT",
                                )}{" "}
                                -{" "}
                                {activity.timestamp?.toLocaleTimeString(
                                  "it-IT",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                              {activity.client && (
                                <>
                                  <span>•</span>
                                  <span>{activity.client}</span>
                                </>
                              )}
                            </div>
                            {activity.tokensUsed && (
                              <Badge
                                variant="secondary"
                                className="border-0 bg-righello-pink/10 text-xs text-righello-pink"
                              >
                                {activity.tokensUsed} token
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="optima-icon-tile mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
                      <Clock className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-white/70">
                      Nessuna attività recente
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/40">
                      Le tue attività appariranno qui quando inizierai a
                      utilizzare la piattaforma
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="optima-glass-card lg:col-span-3 overflow-hidden rounded-2xl border-0">
              <CardHeader className="border-b border-slate-200/60 bg-white/40 dark:border-white/10 dark:bg-white/[0.03]">
                <CardTitle className="flex items-center gap-3 text-slate-950 dark:text-white">
                  <div className="optima-icon-tile rounded-xl p-2">
                    <Brain className="h-5 w-5" />
                  </div>
                  Utilizzo AI
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <div className="text-5xl font-black righello-text-gradient">
                    {Math.round(tokenUsagePercentage)}%
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-white/50">
                    Token utilizzati
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-slate-700 dark:text-white/70">
                    <span>Utilizzo corrente</span>
                    <span className="font-medium">
                      {stats.aiTokensUsed.toLocaleString()} token
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-white/10">
                    <div
                      className="h-3 rounded-full bg-righello-brand transition-all duration-500"
                      style={{
                        width: `${Math.min(100, tokenUsagePercentage)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-white/40">
                    <span>0</span>
                    <span>{stats.aiTokensLimit.toLocaleString()} token</span>
                  </div>
                </div>

                <div className="border-t border-slate-200/60 pt-4 dark:border-white/10">
                  <div className="text-center mb-4">
                    <div className="text-lg font-semibold text-righello-pink">
                      Piano {userData?.plan || "Base"}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/40">
                      Piano attivo
                    </p>
                  </div>
                  <Button className="w-full rounded-full border-0 bg-righello-pink text-white shadow-lg shadow-righello-pink/20 hover:bg-righello-pink-dark">
                    Gestisci Piano
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Technical Architect Dialog */}
      <TechnicalArchitectDialog />
    </div>
  );
}
