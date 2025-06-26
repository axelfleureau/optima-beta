"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Filter, Calendar, Eye, Search } from "lucide-react"
import { useCampaigns } from "@/hooks/use-campaigns"

export default function Campagne() {
  const { campaigns, loading, error } = useCampaigns()

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="text-center">
          <p className="text-red-500">Errore nel caricamento delle campagne: {error}</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "paused":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Attiva"
      case "draft":
        return "Bozza"
      case "completed":
        return "Completata"
      case "paused":
        return "In Pausa"
      default:
        return status
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Campagne</h1>
            <p className="text-gray-600">Gestisci e monitora le tue campagne di marketing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filtri
          </Button>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Periodo
          </Button>
          <Button className="bg-pink-500 hover:bg-pink-600">
            <Plus className="mr-2 h-4 w-4" />
            Nuova Campagna
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca campagne..." className="pl-8" />
        </div>
      </div>

      <Tabs defaultValue="tutte" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tutte">Tutte ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="attive">Attive ({campaigns.filter((c) => c.status === "active").length})</TabsTrigger>
          <TabsTrigger value="bozze">Bozze ({campaigns.filter((c) => c.status === "draft").length})</TabsTrigger>
          <TabsTrigger value="completate">
            Completate ({campaigns.filter((c) => c.status === "completed").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tutte" className="space-y-4">
          {campaigns.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="secondary" className={getStatusColor(campaign.status)}>
                        {getStatusLabel(campaign.status)}
                      </Badge>
                      <div className="text-xs text-gray-500">
                        {campaign.startDate?.toLocaleDateString("it-IT")} -{" "}
                        {campaign.endDate?.toLocaleDateString("it-IT")}
                      </div>
                    </div>
                    <CardTitle className="text-lg">{campaign.title}</CardTitle>
                    <p className="text-sm text-gray-600">{campaign.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progresso</span>
                        <span>{campaign.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${campaign.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {campaign.budget && (
                      <div className="text-sm">
                        <span className="text-gray-500">Budget: </span>
                        <span className="font-medium">€{campaign.budget.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-semibold">{campaign.metrics?.reach?.toLocaleString() || "-"}</p>
                        <p className="text-xs text-gray-500">Reach</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{campaign.metrics?.engagement?.toLocaleString() || "-"}</p>
                        <p className="text-xs text-gray-500">Engagement</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">
                          {campaign.metrics?.conversions?.toLocaleString() || "-"}
                        </p>
                        <p className="text-xs text-gray-500">Conversioni</p>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full text-pink-600 border-pink-200">
                      <Eye className="mr-2 h-3 w-3" />
                      Visualizza dettagli
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Nessuna campagna trovata</p>
              <Button className="bg-pink-500 hover:bg-pink-600">
                <Plus className="mr-2 h-4 w-4" />
                Crea la tua prima campagna
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
