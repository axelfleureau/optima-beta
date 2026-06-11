"use client"

import { useEffect, useRef } from "react"

export const OPERATIONAL_DATA_CHANGED_EVENT = "optima:operational-data-changed"

type LiveRefreshOptions = {
  enabled?: boolean
  intervalMs?: number
  eventName?: string
}

export function notifyOperationalDataChanged(eventName = OPERATIONAL_DATA_CHANGED_EVENT) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(eventName))
}

export function useLiveRefresh(refresh: () => void | Promise<void>, options: LiveRefreshOptions = {}) {
  const { enabled = true, intervalMs = 15000, eventName = OPERATIONAL_DATA_CHANGED_EVENT } = options
  const refreshRef = useRef(refresh)
  const runningRef = useRef(false)

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    if (!enabled) return

    const run = () => {
      if (runningRef.current) return
      runningRef.current = true
      Promise.resolve(refreshRef.current()).finally(() => {
        runningRef.current = false
      })
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") run()
    }

    const interval = window.setInterval(run, intervalMs)
    window.addEventListener("focus", run)
    window.addEventListener(eventName, run)
    document.addEventListener("visibilitychange", refreshWhenVisible)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", run)
      window.removeEventListener(eventName, run)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
    }
  }, [enabled, eventName, intervalMs])
}
