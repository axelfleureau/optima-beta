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
  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
      <CardContent className="p-0">
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
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">{post.name}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400">
                    {format(post.date.toDate(), "dd MMM yyyy", { locale: it })}
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
                      {post.platform.slice(0, 2).map((platform) => (
                        <Badge key={platform} variant="outline" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                      {post.platform.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{post.platform.length - 2}
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
                    <p className="truncate text-slate-600 dark:text-slate-400">{post.caption?.substring(0, 50)}...</p>
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
      </CardContent>
      <CardFooter className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200/50 dark:border-slate-700/50">
        <Button
          variant="outline"
          onClick={onNewPost}
          className="w-full border-dashed border-2 border-slate-300 dark:border-slate-600 hover:border-pink-500 hover:text-pink-500 transition-colors"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Aggiungi nuovo post
        </Button>
      </CardFooter>
    </Card>
  )
}
