"use client"

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
      <div className="flex gap-6 h-full" style={{ minWidth: "1400px" }}>
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={getTasksForColumn(column.id)}
            showAllClients={showAllClients}
            onTaskClick={onTaskClick}
            onAddTaskToColumn={onAddTaskToColumn}
            getPriorityColor={getPriorityColor}
            getScoreColor={getScoreColor}
          />
        ))}
      </div>
    </DragDropContext>
  )
}
