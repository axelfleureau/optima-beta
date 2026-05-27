"use client"

import { useEffect, useState } from "react"
import { DragDropContext } from "@hello-pangea/dnd"
import { KanbanColumn } from "./kanban-column"
import type { Task } from "@/lib/types"

interface Column {
  id: string
  title: string
  color: string
  bgColor: string
  iconColor: string
}

interface KanbanBoardProps {
  tasks: Task[]
  columns: Column[]
  searchTerm: string
  showAllClients: boolean
  onDragEnd: (result: any) => void
  onTaskClick: (task: Task) => void
  onAddTaskToColumn: (columnId: string) => void
  getPriorityColor: (priority: string) => string
  getScoreColor: (score: number) => string
}

export function KanbanBoard({
  tasks,
  columns,
  searchTerm,
  showAllClients,
  onDragEnd,
  onTaskClick,
  onAddTaskToColumn,
  getPriorityColor,
  getScoreColor,
}: KanbanBoardProps) {
  const [dragEnabled, setDragEnabled] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine) and (min-width: 768px)")
    const updateDragMode = () => setDragEnabled(query.matches)

    updateDragMode()
    query.addEventListener("change", updateDragMode)

    return () => query.removeEventListener("change", updateDragMode)
  }, [])

  const getTasksForColumn = (columnId: string) => {
    return tasks.filter(
      (task) =>
        task.columnId === columnId &&
        (searchTerm === "" ||
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (task.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.assignee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.type?.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="-mx-3 min-h-full w-[calc(100%+1.5rem)] min-w-0 overflow-x-auto overflow-y-visible overscroll-x-contain scroll-smooth px-3 pb-4 [-webkit-overflow-scrolling:touch] [touch-action:pan-x_pan-y] sm:-mx-4 sm:w-[calc(100%+2rem)] sm:px-4 lg:mx-0 lg:h-full lg:min-h-0 lg:w-full lg:overflow-y-hidden lg:px-0 lg:pb-0">
        <div className="flex min-h-full w-max min-w-full snap-x snap-proximity items-stretch gap-3 pb-2 md:gap-5 md:snap-none lg:h-full lg:min-h-0 lg:gap-6">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={getTasksForColumn(column.id)}
              dragEnabled={dragEnabled}
              showAllClients={showAllClients}
              onTaskClick={onTaskClick}
              onAddTaskToColumn={onAddTaskToColumn}
              getPriorityColor={getPriorityColor}
              getScoreColor={getScoreColor}
            />
          ))}
        </div>
      </div>
    </DragDropContext>
  )
}
