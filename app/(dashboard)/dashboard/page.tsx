"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Progress } from "@/components/ui/progress"
import { Plus, Search } from "lucide-react"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { useAuth } from "@/lib/auth-context"

export default function Dashboard() {
  const { userData } = useAuth()
  const { stats, recentActivities, loading } = useDashboardData()

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const tokenUsagePercentage = (stats.aiTokensUsed / stats.aiTokensLimit) * 100

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Benvenuto, {userData?.firstName || "Utente"}!</h2>
            <p className="text-muted-foreground">{userData?.companyName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cerca..." className="pl-8 w-[300px]" />
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campagne Attive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">campagne in corso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preventivi Inviati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sentQuotes}</div>
            <p className="text-xs text-muted-foreground">in attesa di risposta</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Completati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground">questo mese</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Token AI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.aiTokensUsed / 1000)}K</div>
            <div className="mt-2">
              <Progress value={tokenUsagePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats.aiTokensUsed.toLocaleString()} / {stats.aiTokensLimit.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Attività Recenti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.timestamp?.toLocaleDateString("it-IT")} -{" "}
                      {activity.timestamp?.toLocaleTimeString("it-IT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nessuna attività recente</p>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Piano Attuale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-500">Piano {userData?.plan}°</div>
              <p className="text-sm text-muted-foreground">Piano attivo</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Token AI utilizzati</span>
                <span>{Math.round(tokenUsagePercentage)}%</span>
              </div>
              <Progress value={tokenUsagePercentage} />
            </div>
            <Button className="w-full" variant="outline">
              Gestisci Piano
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
