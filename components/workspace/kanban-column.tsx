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
  availableColumns: Column[]
  onTaskClick: (task: Task) => void
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  onDeleteTask: (task: Task) => void
  onAddTaskToColumn: (columnId: string) => void
  getPriorityColor: (priority: string) => string
  getScoreColor: (score: number) => string
}

export function KanbanColumn({
  column,
  tasks,
  dragEnabled,
  showAllClients,
  availableColumns,
  onTaskClick,
  onUpdateTask,
  onDeleteTask,
  onAddTaskToColumn,
  getPriorityColor,
  getScoreColor,
}: KanbanColumnProps) {
  return (
    <div key={column.id} className="flex min-h-[70dvh] min-w-[84vw] max-w-[84vw] snap-start flex-col [touch-action:pan-x_pan-y] sm:min-w-[390px] sm:max-w-[390px] lg:h-full lg:min-h-0 lg:min-w-[296px] lg:max-w-none xl:w-80">
      <div className={`shrink-0 rounded-t-[8px] border-x border-t bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${column.color}`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${column.bgColor}`}>
              <Clock className={`h-4 w-4 ${column.iconColor}`} />
            </div>
            <h3 className="truncate text-sm font-black text-slate-950 dark:text-slate-50">{column.title}</h3>
          </div>
          <Badge variant="secondary" className="rounded-[8px] bg-slate-100 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {tasks.length}
          </Badge>
        </div>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[55dvh] flex-1 space-y-3 overflow-visible rounded-b-[8px] border-x border-b border-slate-200 bg-white/70 p-3 transition-colors duration-150 [-webkit-overflow-scrolling:touch] [touch-action:pan-x_pan-y] dark:border-slate-800 dark:bg-slate-950/45 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:[touch-action:pan-y] ${
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
                availableColumns={availableColumns}
                onTaskClick={onTaskClick}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                getPriorityColor={getPriorityColor}
                getScoreColor={getScoreColor}
              />
            ))}
            {provided.placeholder}

            <Button
              variant="ghost"
              className="h-12 w-full rounded-[8px] border border-dashed border-slate-300 text-sm font-bold text-slate-500 transition-all duration-150 hover:border-righello-pink hover:bg-righello-pink/10 hover:text-righello-pink dark:border-slate-700 dark:text-slate-300 dark:hover:border-righello-pink"
              onClick={() => onAddTaskToColumn(column.id)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi task
            </Button>
          </div>
        )}
      </Droppable>
    </div>
  )
}
