"use client"

import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Clock, PlusCircle } from "lucide-react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { EditorialPost } from "@/lib/types"
import { statusConfig, statusOrder } from "../utils/status-config"

interface KanbanViewProps {
  postsByStatus: Record<string, EditorialPost[]>
  onDragEnd: (result: DropResult) => void
  onEditPost: (post: EditorialPost) => void
  onNewPost: () => void
}

export function KanbanView({ postsByStatus, onDragEnd, onEditPost, onNewPost }: KanbanViewProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {statusOrder.map((statusKey) => {
          const statusInfo = statusConfig[statusKey]
          const postsInStatus = postsByStatus[statusKey] || []

          return (
            <Droppable key={statusKey} droppableId={statusKey}>
              {(provided, snapshot) => (
                <Card
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden transition-all duration-200 ${
                    snapshot.isDraggingOver ? "ring-2 ring-pink-500 ring-opacity-50 scale-105" : ""
                  }`}
                >
                  <CardHeader className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200/50 dark:border-slate-700/50">
                    <CardTitle className="flex items-center justify-between text-sm font-semibold">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${statusInfo.color}`}></div>
                        <statusInfo.icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <span className="text-slate-700 dark:text-slate-300">{statusInfo.label}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs font-medium">
                        {postsInStatus.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto">
                    {postsInStatus.map((post, index) => (
                      <Draggable key={post.id} draggableId={post.id} index={index}>
                        {(providedDraggable, snapshotDraggable) => (
                          <Card
                            ref={providedDraggable.innerRef}
                            {...providedDraggable.draggableProps}
                            {...providedDraggable.dragHandleProps}
                            className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-lg border border-slate-200/50 dark:border-slate-700/50 ${
                              snapshotDraggable.isDragging ? "shadow-2xl rotate-2 scale-105" : "hover:scale-102"
                            }`}
                            onClick={() => onEditPost(post)}
                          >
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2">
                                {post.name}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Clock className="w-3 h-3" />
                                {format(post.date.toDate(), "d MMM", { locale: it })}
                              </div>
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
                              {post.format && (
                                <Badge variant="secondary" className="text-xs">
                                  {post.format}
                                </Badge>
                              )}
                              {post.objective && (
                                <Badge variant="outline" className="text-xs">
                                  {post.objective}
                                </Badge>
                              )}
                            </div>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    <Button
                      variant="ghost"
                      onClick={onNewPost}
                      className="w-full mt-3 border-dashed border-2 border-slate-300 dark:border-slate-600 hover:border-pink-500 hover:text-pink-500 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Nuovo Post
                    </Button>
                  </CardContent>
                </Card>
              )}
            </Droppable>
          )
        })}
      </div>
    </DragDropContext>
  )
}
