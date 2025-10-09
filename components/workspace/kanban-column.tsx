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
  showAllClients: boolean
  onTaskClick: (task: Task) => void
  onAddTaskToColumn: (columnId: string) => void
  getPriorityColor: (priority: string) => string
  getScoreColor: (score: number) => string
}

export function KanbanColumn({
  column,
  tasks,
  showAllClients,
  onTaskClick,
  onAddTaskToColumn,
  getPriorityColor,
  getScoreColor,
}: KanbanColumnProps) {
  return (
    <div key={column.id} className="flex flex-col min-w-[80vw] md:min-w-[320px] lg:min-w-[280px] xl:w-80 snap-start">
      <div className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-t-2xl p-3 md:p-4 shadow-lg border-t-4 ${column.color}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 md:gap-3">
            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg ${column.bgColor} flex items-center justify-center shadow-sm`}>
              <Clock className={`h-3 w-3 md:h-4 md:w-4 ${column.iconColor}`} />
            </div>
            <h3 className="font-semibold text-sm md:text-base text-slate-900 dark:text-slate-100">{column.title}</h3>
          </div>
          <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-b-2xl p-3 md:p-4 space-y-3 transition-all duration-200 max-h-[calc(100vh-280px)] overflow-y-auto ${
              snapshot.isDraggingOver ? "bg-blue-50/60 dark:bg-blue-900/20 ring-2 ring-blue-300 dark:ring-blue-600" : ""
            }`}
            style={{ minHeight: "400px" }}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                showAllClients={showAllClients}
                onTaskClick={onTaskClick}
                getPriorityColor={getPriorityColor}
                getScoreColor={getScoreColor}
              />
            ))}
            {provided.placeholder}

            <Button
              variant="ghost"
              className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 h-10 md:h-12 text-xs md:text-sm text-slate-500 dark:text-slate-400 hover:border-pink-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all duration-200"
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
