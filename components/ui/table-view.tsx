"use client"

import { List, MoreHorizontal, Edit3, Trash2, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import type { EditorialPost } from "@/lib/types"
import { statusConfig } from "../../app/(dashboard)/calendario-editoriale/utils/status-config"

interface TableViewProps {
  posts: EditorialPost[]
  onEditPost: (post: EditorialPost) => void
  onDeletePost: (postId: string) => void
  onNewPost: () => void
  selectedClientId: string | null
  userRole?: string
}

export function TableView({ posts, onEditPost, onDeletePost, onNewPost, selectedClientId, userRole }: TableViewProps) {
  // Helper per ottenere la data del post (compatibile con legacy)
  const getPostDate = (post: EditorialPost): Date => {
    if (post.date && typeof post.date.toDate === "function") {
      return post.date.toDate()
    }
    // Usa scheduledDate e scheduledTime se disponibili
    const dateStr = post.scheduledDate
    const timeStr = post.scheduledTime || "00:00"
    return new Date(`${dateStr}T${timeStr}:00`)
  }

  return (
    <Card className="overflow-hidden rounded-[8px] border-slate-200/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/80">
      <CardContent className="p-0">
        <div className="space-y-3 p-3 md:hidden">
          {posts.length === 0 && (
            <div className="rounded-[8px] border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
              <List className="mx-auto mb-3 h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Nessun post trovato</p>
              {!selectedClientId && userRole !== "client" && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                  Seleziona un cliente per visualizzare i contenuti
                </p>
              )}
            </div>
          )}

          {posts.map((post) => {
            const statusInfo = statusConfig[post.status]
            const StatusIcon = statusInfo.icon
            const postText = post.caption || post.content

            return (
              <div
                key={post.id}
                className="min-w-0 rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
              >
                <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950 dark:text-slate-100">
                      {post.name || post.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {format(getPostDate(post), "dd MMM yyyy", { locale: it })}
                      {post.scheduledTime ? `, ${post.scheduledTime}` : ""}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-[8px]">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onEditPost(post)}>
                        <Edit3 className="mr-2 h-4 w-4" />
                        Modifica
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDeletePost(post.id)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Elimina
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={`${statusInfo.lightColor} dark:${statusInfo.darkColor} border text-xs font-medium`}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {statusInfo.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {post.platform}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {post.format}
                  </Badge>
                </div>

                {postText && <p className="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{postText}</p>}

                <Button onClick={() => onEditPost(post)} variant="outline" size="sm" className="mt-3 w-full rounded-[8px]">
                  Apri post
                </Button>
              </div>
            )
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Nome</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Data</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Stato</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Formato</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Piattaforme</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Obiettivo</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Visual</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300 w-[200px]">Caption</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Note</TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center h-32">
                  <div className="space-y-3">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                      <List className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Nessun post trovato</p>
                      {!selectedClientId && userRole !== "client" && (
                        <p className="text-sm text-slate-500 dark:text-slate-500">
                          Seleziona un cliente per visualizzare i contenuti
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {posts.map((post) => {
              const statusInfo = statusConfig[post.status]
              return (
                <TableRow
                  key={post.id}
                  className="border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">{post.name || post.title}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400">
                    {format(getPostDate(post), "dd MMM yyyy", { locale: it })}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusInfo.lightColor} dark:${statusInfo.darkColor} border font-medium`}>
                      <statusInfo.icon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400">{post.format}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {post.platform && (
                        <Badge variant="outline" className="text-xs">
                          {post.platform}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400">
                    {post.objective ? (
                      <Badge variant="secondary" className="text-xs">
                        {post.objective}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {post.visuals && post.visuals.length > 0 ? (
                      <a
                        href={post.visuals[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-500 hover:text-pink-600 font-medium transition-colors"
                      >
                        Visual ({post.visuals.length})
                      </a>
                    ) : (
                      <span className="text-slate-400">Nessuno</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-slate-600 dark:text-slate-400">
                      {(post.caption || post.content)?.substring(0, 50)}...
                    </p>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-slate-600 dark:text-slate-400">{post.notes?.substring(0, 50)}...</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onEditPost(post)}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeletePost(post.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      </CardContent>
      <CardFooter className="border-t border-slate-200/50 bg-slate-50/50 p-4 dark:border-slate-700/50 dark:bg-slate-800/50 sm:p-6">
        <Button
          variant="outline"
          onClick={onNewPost}
          className="w-full rounded-[8px] border-2 border-dashed border-slate-300 bg-transparent transition-colors hover:border-pink-500 hover:text-pink-500 dark:border-slate-600"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Aggiungi nuovo post
        </Button>
      </CardFooter>
    </Card>
  )
}
