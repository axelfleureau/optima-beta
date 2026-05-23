"use client"

import { Droppable } from "@hello-pangea/dnd"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Clock } from "lucide-react"
import { TaskCard } from "./task-card"
import type { Task } from "@/lib/types"

interface Column {
  id: string
  title: string
  color: string
  bgColor: string
  iconColor: string
}

interface KanbanColumnProps {
  column: Column
  tasks: Task[]
  dragEnabled: boolean
  showAllClients: boolean
  onTaskClick: (task: Task) => void
  onAddTaskToColumn: (columnId: string) => void
  getPriorityColor: (priority: string) => string
  getScoreColor: (score: number) => string
}

export function KanbanColumn({
  column,
  tasks,
  dragEnabled,
  showAllClients,
  onTaskClick,
  onAddTaskToColumn,
  getPriorityColor,
  getScoreColor,
}: KanbanColumnProps) {
  return (
    <div key={column.id} className="flex h-full min-h-0 min-w-[88vw] max-w-[88vw] snap-start flex-col sm:min-w-[420px] sm:max-w-[420px] lg:min-w-[312px] lg:max-w-none xl:w-88">
      <div className={`flex-shrink-0 rounded-t-lg border-x border-t bg-white/95 p-3 shadow-corporate-medium dark:border-slate-700 dark:bg-slate-900 md:p-4 ${column.color}`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${column.bgColor} shadow-sm`}>
              <Clock className={`h-3 w-3 md:h-4 md:w-4 ${column.iconColor}`} />
            </div>
            <h3 className="truncate text-sm font-bold text-slate-950 dark:text-slate-50 md:text-base">{column.title}</h3>
          </div>
          <Badge variant="secondary" className="bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {tasks.length}
          </Badge>
        </div>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`mobile-scroll-container min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-b-lg border-x border-b border-slate-200/80 bg-slate-100/70 p-3 transition-colors duration-150 [-webkit-overflow-scrolling:touch] [touch-action:pan-y] dark:border-slate-700 dark:bg-slate-900/55 md:p-4 ${
              snapshot.isDraggingOver ? "bg-cyan-50/80 ring-2 ring-cyan-300 dark:bg-cyan-950/30 dark:ring-cyan-500" : ""
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                dragEnabled={dragEnabled}
                showAllClients={showAllClients}
                onTaskClick={onTaskClick}
                getPriorityColor={getPriorityColor}
                getScoreColor={getScoreColor}
              />
            ))}
            {provided.placeholder}

            <Button
              variant="ghost"
              className="h-12 w-full border-2 border-dashed border-slate-400/70 text-sm font-semibold text-slate-500 transition-all duration-200 hover:border-righello-pink hover:bg-righello-pink/10 hover:text-righello-pink dark:border-slate-600 dark:text-slate-300 dark:hover:border-righello-pink"
              onClick={() => onAddTaskToColumn(column.id)}
            >
              <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              Aggiungi task
            </Button>
          </div>
        )}
      </Droppable>
    </div>
  )
}
