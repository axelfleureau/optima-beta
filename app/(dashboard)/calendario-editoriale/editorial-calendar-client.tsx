"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEditorialPosts } from "@/hooks/use-editorial-posts";
import { useClients } from "@/hooks/use-clients";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { EditorialPost, EditorialPostStatus } from "@/lib/types";
import {
  EditorialPostStatus as PostStatusEnum,
  EditorialPostFormat as PostFormatEnum,
  SocialPlatform as PlatformEnum,
} from "@/lib/types";
import { Timestamp } from "firebase/firestore";
import type { DropResult } from "@hello-pangea/dnd";

import { CalendarHeader } from "../../../components/ui/calendar-header";
import { CalendarTabs } from "../../../components/ui/calendar-tabs";
import { TableView } from "../../../components/ui/table-view";
import { KanbanView } from "../../../components/ui/kanban-view";
import { CalendarView } from "../../../components/ui/calendar-view";
import { PostFormDialog as EditorialPostFormDialog } from "../../../components/ui/post-form-dialog";
import { AutoGenPreview } from "../../../components/calendar/auto-gen-preview";
import { statusConfig, statusOrder } from "./utils/status-config";
import { useCalendarExperience } from "@/lib/calendar-experience-context";
import { ViewSwitcher } from "../../../components/calendar/view-switcher";
import { CalendarWeekView } from "../../../components/calendar/calendar-week-view";
import { CalendarDayView } from "../../../components/calendar/calendar-day-view";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Target,
} from "lucide-react";

type ContentTrackerSummary = {
  clients: number;
  targetTotal: number;
  createdTotal: number;
  missingTotal: number;
  missingVideoReel: number;
  missingPhotoPost: number;
  complete: number;
  toSchedule: number;
};

type ContentTrackerRow = {
  id: string;
  clientName: string;
  targetTotal: number;
  createdTotal: number;
  missingTotal: number;
  missingVideoReel: number;
  missingPhotoPost: number;
  status: "complete" | "to_schedule";
};

function monthFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [year, rawMonth] = month.split("-");
  const date = new Date(Number(year), Number(rawMonth || 1) - 1, 1);
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function EditorialCalendarClient() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"table" | "kanban" | "calendar">(
    "calendar",
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EditorialPost | null>(null);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [trackerSummary, setTrackerSummary] =
    useState<ContentTrackerSummary | null>(null);
  const [trackerRows, setTrackerRows] = useState<ContentTrackerRow[]>([]);
  const [trackerLoading, setTrackerLoading] = useState(false);

  const {
    viewMode,
    selectedDate,
    setSelectedDate,
    setPosts,
    filteredPosts: contextFilteredPosts,
  } = useCalendarExperience();

  const { clients, loading: clientsLoading } = useClients();
  const {
    posts,
    loading: postsLoading,
    addPost,
    updatePost,
    deletePost,
    updatePostStatus,
  } = useEditorialPosts(selectedClientId);

  const trackerMonth = useMemo(
    () => monthFromDate(selectedDate),
    [selectedDate],
  );

  // Ensure component is mounted before rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userData?.role === "client" && userData.clientId && !selectedClientId) {
      setSelectedClientId(userData.clientId);
    }
  }, [userData, selectedClientId]);

  useEffect(() => {
    setPosts(posts);
  }, [posts, setPosts]);

  useEffect(() => {
    let alive = true;
    setTrackerLoading(true);
    fetch(`/api/content-tracker?month=${trackerMonth}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((payload) => {
        if (!alive || !payload?.ok) return;
        setTrackerSummary(payload.summary || null);
        setTrackerRows(payload.rows || []);
      })
      .catch(() => {
        if (!alive) return;
        setTrackerSummary(null);
        setTrackerRows([]);
      })
      .finally(() => {
        if (alive) setTrackerLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [trackerMonth]);

  const filteredPosts = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return posts.filter((post) => {
      const platform = Array.isArray(post.platform)
        ? post.platform.join(" ")
        : post.platform;
      return (
        post.name?.toLowerCase().includes(search) ||
        post.title?.toLowerCase().includes(search) ||
        post.caption?.toLowerCase().includes(search) ||
        post.content?.toLowerCase().includes(search) ||
        platform?.toLowerCase().includes(search)
      );
    });
  }, [posts, searchTerm]);

  const postsByStatus = useMemo(() => {
    const grouped: Record<string, EditorialPost[]> = {};
    statusOrder.forEach((status) => (grouped[status] = []));
    filteredPosts.forEach((post) => {
      if (grouped[post.status]) {
        grouped[post.status].push(post);
      } else {
        if (!grouped[PostStatusEnum.ARCHIVIATO])
          grouped[PostStatusEnum.ARCHIVIATO] = [];
        grouped[PostStatusEnum.ARCHIVIATO].push(post);
      }
    });
    return grouped;
  }, [filteredPosts]);

  // Don't render anything until mounted
  if (!mounted) {
    return (
      <div className="flex h-[calc(100svh-73px)] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-purple-50 to-pink-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-800 md:min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
            Inizializzazione...
          </p>
        </div>
      </div>
    );
  }

  // Show loading if user data is not available
  if (!userData) {
    return (
      <div className="flex h-[calc(100svh-73px)] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-purple-50 to-pink-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-800 md:min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
            Autenticazione...
          </p>
        </div>
      </div>
    );
  }

  const handleAddOrEditPost = async (values: Partial<EditorialPost>) => {
    try {
      if (!values.clientId && selectedClientId) {
        values.clientId = selectedClientId;
      } else if (
        !values.clientId &&
        userData?.role === "client" &&
        userData.clientId
      ) {
        values.clientId = userData.clientId;
      }

      if (!values.clientId) {
        toast({
          title: "Errore",
          description: "Seleziona un cliente per il post.",
          variant: "destructive",
        });
        return;
      }

      if (editingPost) {
        const postExists = posts.find((p) => p.id === editingPost.id);
        if (!postExists) {
          toast({
            title: "Errore",
            description: "Il post non esiste più. Ricarica la pagina.",
            variant: "destructive",
          });
          return;
        }
        await updatePost(editingPost.id, values);
        toast({
          title: "Successo",
          description: "Post aggiornato con successo.",
        });
      } else {
        const newPostData = {
          name: values.name || values.title || "Nuovo Post",
          title: values.title || "Nuovo Post",
          content: values.content || "",
          description: values.description || "",
          date: values.date || Timestamp.now(),
          status: values.status || PostStatusEnum.IDEA,
          platform: values.platform || [PlatformEnum.INSTAGRAM],
          format: values.format || PostFormatEnum.POST_SINGOLO,
          clientId: values.clientId,
          scheduledDate: values.scheduledDate,
          scheduledTime: values.scheduledTime,
          attachments: values.attachments || [],
          type: values.type || "post",
        } as Omit<
          EditorialPost,
          "id" | "createdAt" | "updatedAt" | "tenantId" | "createdBy"
        >;

        await addPost(newPostData);
        toast({ title: "Successo", description: "Post creato con successo." });
      }
      setIsFormOpen(false);
      setEditingPost(null);
    } catch (error) {
      console.error("Error saving post:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il post.",
        variant: "destructive",
      });
    }
  };

  const openEditForm = (post: EditorialPost) => {
    setEditingPost(post);
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingPost(null);
    setIsFormOpen(true);
  };

  const handleDeletePost = async (postId: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questo post?")) {
      try {
        await deletePost(postId);
        toast({ title: "Successo", description: "Post eliminato." });
      } catch (error) {
        console.error("Error deleting post:", error);
        toast({
          title: "Errore",
          description: "Impossibile eliminare il post.",
          variant: "destructive",
        });
      }
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const postExists = posts.find((post) => post.id === draggableId);
    if (!postExists) {
      console.error("[v0] Post not found in local state:", draggableId);
      toast({
        title: "Errore",
        description: "Il post non è più disponibile. Ricarica la pagina.",
        variant: "destructive",
      });
      return;
    }

    const newStatus = destination.droppableId as EditorialPostStatus;

    console.log("[v0] Updating post status:", {
      postId: draggableId,
      newStatus,
      postName: postExists.name,
    });

    updatePostStatus(draggableId, newStatus)
      .then(() => {
        console.log("[v0] Post status updated successfully");
        toast({
          title: "Aggiornato",
          description: `Stato del post aggiornato a ${statusConfig[newStatus].label}.`,
        });
      })
      .catch((err) => {
        console.error("[v0] Failed to update post status:", err);
        if (err.message?.includes("No document to update")) {
          toast({
            title: "Errore",
            description:
              "Il post non esiste più nel database. Ricarica la pagina.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Errore",
            description: "Impossibile aggiornare lo stato del post.",
            variant: "destructive",
          });
        }
      });
  };

  if (postsLoading || clientsLoading) {
    return (
      <div className="optima-ops-page flex items-center justify-center overflow-hidden">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-white/10 border-t-righello-pink rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-medium text-slate-400">
            Caricamento calendario editoriale...
          </p>
        </div>
      </div>
    );
  }

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.name,
  }));

  return (
    <div className="optima-ops-page">
      <div className="sticky top-0 z-30 min-w-0 border-b border-white/10 bg-[#111827]/95 backdrop-blur-xl">
        <CalendarHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onNewPost={openNewForm}
          selectedClientId={selectedClientId}
          onClientChange={setSelectedClientId}
          clientOptions={clientOptions}
          userRole={userData?.role}
        />
      </div>

      <div className="optima-ops-container overflow-x-hidden">
        <ContentCoveragePanel
          month={trackerMonth}
          loading={trackerLoading}
          summary={trackerSummary}
          rows={trackerRows}
        />

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
          className="min-w-0 space-y-4 md:space-y-6"
        >
          <CalendarTabs
            activeTab={activeTab}
            onTabChange={(tab) =>
              setActiveTab(tab as "table" | "kanban" | "calendar")
            }
          />

          <TabsContent value="table" className="min-w-0 space-y-4 md:space-y-6">
            <TableView
              posts={filteredPosts}
              onEditPost={openEditForm}
              onDeletePost={handleDeletePost}
              onNewPost={openNewForm}
              selectedClientId={selectedClientId}
              userRole={userData?.role}
            />
          </TabsContent>

          <TabsContent
            value="kanban"
            className="min-w-0 space-y-4 md:space-y-6"
          >
            <KanbanView
              postsByStatus={postsByStatus}
              onDragEnd={onDragEnd}
              onEditPost={openEditForm}
              onNewPost={openNewForm}
            />
          </TabsContent>

          <TabsContent
            value="calendar"
            className="min-w-0 space-y-4 md:space-y-6"
          >
            <div className="mb-2 min-w-0 md:mb-4">
              <ViewSwitcher />
            </div>

            {viewMode === "month" && (
              <CalendarView
                posts={filteredPosts}
                currentMonth={selectedDate}
                onMonthChange={setSelectedDate}
                onEditPost={openEditForm}
              />
            )}

            {viewMode === "week" && (
              <CalendarWeekView
                posts={filteredPosts}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onEditPost={openEditForm}
              />
            )}

            {viewMode === "day" && (
              <CalendarDayView
                posts={filteredPosts}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onEditPost={openEditForm}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <EditorialPostFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingPost(null);
        }}
        onSave={handleAddOrEditPost}
        editingPost={editingPost}
        clients={clientOptions}
        selectedClientId={selectedClientId}
        userRole={userData?.role}
      />

      <AutoGenPreview />
    </div>
  );
}

function ContentCoveragePanel({
  month,
  loading,
  summary,
  rows,
}: {
  month: string;
  loading: boolean;
  summary: ContentTrackerSummary | null;
  rows: ContentTrackerRow[];
}) {
  const missingRows = rows
    .filter((row) => row.missingTotal > 0)
    .sort((a, b) => b.missingTotal - a.missingTotal)
    .slice(0, 5);

  return (
    <section className="mb-4 rounded-lg border border-white/10 bg-[#111b2d] p-4 shadow-2xl shadow-black/10 md:mb-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
                Copertura mese
              </p>
              <h2 className="text-lg font-bold text-white">
                Target contenuti di {monthLabel(month)}
              </h2>
            </div>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            I numeri arrivano dal tracker contenuti: target, creati e mancanti
            sostituiscono il controllo manuale del foglio Excel.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[520px]">
          <CoverageStat
            icon={Target}
            label="Target"
            value={loading ? "..." : (summary?.targetTotal ?? 0)}
          />
          <CoverageStat
            icon={CheckCircle2}
            label="Creati"
            value={loading ? "..." : (summary?.createdTotal ?? 0)}
            tone="emerald"
          />
          <CoverageStat
            icon={AlertTriangle}
            label="Mancanti"
            value={loading ? "..." : (summary?.missingTotal ?? 0)}
            tone="amber"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {missingRows.length === 0 ? (
            <Badge
              variant="outline"
              className="border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
            >
              Nessun contenuto mancante nel mese
            </Badge>
          ) : (
            missingRows.map((row) => (
              <Badge
                key={row.id}
                variant="outline"
                className="border-amber-400/30 bg-amber-500/10 text-amber-100"
              >
                {row.clientName}: {row.missingTotal} mancanti
              </Badge>
            ))
          )}
        </div>
        <Button
          asChild
          variant="outline"
          className="h-10 border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/40"
        >
          <Link href="/contenuti">Apri tracker</Link>
        </Button>
      </div>
    </section>
  );
}

function CoverageStat({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: typeof Target;
  label: string;
  value: number | string;
  tone?: "slate" | "emerald" | "amber";
}) {
  const toneClass = {
    slate: "border-white/10 bg-[#0b1424] text-white",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-100",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          {label}
        </span>
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
