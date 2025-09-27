"use client"

import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  className?: string
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-300/20 dark:bg-gray-700/20",
        className
      )}
    />
  )
}

export function LoadingCard() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <LoadingSkeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <LoadingSkeleton className="h-4 w-32" />
          <LoadingSkeleton className="h-3 w-24" />
        </div>
      </div>
      <LoadingSkeleton className="h-20 w-full" />
      <div className="flex space-x-2">
        <LoadingSkeleton className="h-8 w-16" />
        <LoadingSkeleton className="h-8 w-20" />
      </div>
    </div>
  )
}

export function LoadingTable() {
  return (
    <div className="rounded-md border">
      {/* Header */}
      <div className="border-b p-4">
        <LoadingSkeleton className="h-6 w-full" />
      </div>
      
      {/* Rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b p-4 last:border-b-0">
          <div className="flex items-center space-x-4">
            <LoadingSkeleton className="h-8 w-8 rounded-full" />
            <LoadingSkeleton className="h-4 w-48" />
            <LoadingSkeleton className="h-4 w-32 ml-auto" />
            <LoadingSkeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function LoadingStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <LoadingSkeleton className="h-4 w-24" />
            <LoadingSkeleton className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <LoadingSkeleton className="h-8 w-16" />
            <LoadingSkeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function LoadingCalendar() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <LoadingSkeleton className="h-6 w-32" />
        <div className="flex space-x-2">
          <LoadingSkeleton className="h-8 w-8" />
          <LoadingSkeleton className="h-8 w-8" />
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Headers */}
        {Array.from({ length: 7 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-8 w-full" />
        ))}
        
        {/* Days */}
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square p-2 border rounded">
            <LoadingSkeleton className="h-4 w-6" />
            {Math.random() > 0.7 && (
              <LoadingSkeleton className="h-2 w-full mt-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function LoadingChat() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-4 h-96">
      <div className="flex items-center space-x-2 pb-2 border-b">
        <LoadingSkeleton className="h-6 w-6 rounded-full" />
        <LoadingSkeleton className="h-4 w-24" />
      </div>
      
      <div className="space-y-4 flex-1">
        {/* Messages */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(
            "flex space-x-2",
            i % 2 === 0 ? "justify-start" : "justify-end"
          )}>
            {i % 2 === 0 && <LoadingSkeleton className="h-8 w-8 rounded-full" />}
            <div className={cn(
              "max-w-xs space-y-1",
              i % 2 === 0 ? "items-start" : "items-end"
            )}>
              <LoadingSkeleton className="h-10 w-48 rounded-2xl" />
              <LoadingSkeleton className="h-3 w-16" />
            </div>
            {i % 2 === 1 && <LoadingSkeleton className="h-8 w-8 rounded-full" />}
          </div>
        ))}
      </div>
      
      <div className="border-t pt-2">
        <LoadingSkeleton className="h-10 w-full rounded-full" />
      </div>
    </div>
  )
}