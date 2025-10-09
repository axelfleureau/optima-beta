"use client"

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react"
import type { EditorialPost } from "@/lib/types"
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns"

export type ViewMode = "month" | "week" | "day"

export interface CalendarFilters {
  platform?: string
  status?: string
  client?: string
}

export interface TimelineRange {
  start: Date
  end: Date
}

export interface CalendarExperienceState {
  viewMode: ViewMode
  selectedDate: Date
  timelineRange: TimelineRange
  filters: CalendarFilters
  posts: EditorialPost[]
}

export interface CalendarExperienceContextType extends CalendarExperienceState {
  setViewMode: (mode: ViewMode) => void
  setSelectedDate: (date: Date) => void
  setFilters: (filters: CalendarFilters) => void
  setPosts: (posts: EditorialPost[]) => void
  updatePost: (postId: string, updates: Partial<EditorialPost>) => void
  filteredPosts: EditorialPost[]
  postsInRange: EditorialPost[]
}

const CalendarExperienceContext = createContext<CalendarExperienceContextType | undefined>(undefined)

function calculateTimelineRange(date: Date, mode: ViewMode): TimelineRange {
  switch (mode) {
    case "day":
      return {
        start: startOfDay(date),
        end: endOfDay(date),
      }
    case "week":
      return {
        start: startOfWeek(date, { weekStartsOn: 1 }),
        end: endOfWeek(date, { weekStartsOn: 1 }),
      }
    case "month":
    default:
      return {
        start: startOfMonth(date),
        end: endOfMonth(date),
      }
  }
}

export function CalendarExperienceProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>("month")
  const [selectedDate, setSelectedDateState] = useState<Date>(new Date())
  const [filters, setFiltersState] = useState<CalendarFilters>({})
  const [posts, setPosts] = useState<EditorialPost[]>([])

  const timelineRange = useMemo(
    () => calculateTimelineRange(selectedDate, viewMode),
    [selectedDate, viewMode]
  )

  useEffect(() => {
    const savedViewMode = localStorage.getItem("calendar-view-mode")
    if (savedViewMode && (savedViewMode === "month" || savedViewMode === "week" || savedViewMode === "day")) {
      setViewModeState(savedViewMode as ViewMode)
    }
  }, [])

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode)
    localStorage.setItem("calendar-view-mode", mode)
  }, [])

  const setSelectedDate = useCallback((date: Date) => {
    setSelectedDateState(date)
  }, [])

  const setFilters = useCallback((newFilters: CalendarFilters) => {
    setFiltersState(newFilters)
  }, [])

  const updatePost = useCallback((postId: string, updates: Partial<EditorialPost>) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, ...updates } : post))
    )
  }, [])

  // Note: Filtering is handled by EditorialCalendarClient, we just pass through posts
  const filteredPosts = useMemo(() => posts, [posts])

  const postsInRange = useMemo(() => {
    return posts.filter((post) => {
      // Safe date normalization
      let postDate: Date | null = null
      if (post.date && typeof post.date.toDate === 'function') {
        postDate = post.date.toDate()
      } else if (post.scheduledDate) {
        postDate = new Date(post.scheduledDate)
      }
      
      if (!postDate) return false
      return postDate >= timelineRange.start && postDate <= timelineRange.end
    })
  }, [posts, timelineRange])

  const value: CalendarExperienceContextType = {
    viewMode,
    selectedDate,
    timelineRange,
    filters,
    posts,
    setViewMode,
    setSelectedDate,
    setFilters,
    setPosts,
    updatePost,
    filteredPosts,
    postsInRange,
  }

  return <CalendarExperienceContext.Provider value={value}>{children}</CalendarExperienceContext.Provider>
}

export function useCalendarExperience() {
  const context = useContext(CalendarExperienceContext)
  if (context === undefined) {
    throw new Error("useCalendarExperience must be used within CalendarExperienceProvider")
  }
  return context
}
