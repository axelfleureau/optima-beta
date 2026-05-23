"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const LOCKED_BODY_STYLES = ["overflow", "paddingRight", "marginRight", "pointerEvents"] as const
const LOCKED_DOCUMENT_STYLES = ["overflow", "overscrollBehavior"] as const

function hasOpenBlockingLayer() {
  if (typeof document === "undefined") return true

  return Boolean(
    document.querySelector(
      [
        '[role="dialog"][data-state="open"]',
        '[role="alertdialog"][data-state="open"]',
        '[data-sidebar="sidebar"][data-mobile="true"][data-state="open"]',
      ].join(",")
    )
  )
}

function clearStaleScrollLock() {
  if (typeof document === "undefined") return
  if (hasOpenBlockingLayer()) return

  const { body, documentElement } = document
  const bodyLooksLocked =
    body.hasAttribute("data-scroll-locked") ||
    body.style.overflow === "hidden" ||
    documentElement.style.overflow === "hidden" ||
    body.style.pointerEvents === "none"

  if (!bodyLooksLocked) return

  body.removeAttribute("data-scroll-locked")
  body.removeAttribute("data-scroll-lock")
  LOCKED_BODY_STYLES.forEach((property) => {
    body.style[property] = ""
  })
  LOCKED_DOCUMENT_STYLES.forEach((property) => {
    documentElement.style[property] = ""
  })
}

export function ScrollStabilityGuard() {
  const pathname = usePathname()

  useEffect(() => {
    const scheduleCleanup = () => {
      window.requestAnimationFrame(clearStaleScrollLock)
      window.setTimeout(clearStaleScrollLock, 120)
      window.setTimeout(clearStaleScrollLock, 450)
    }

    scheduleCleanup()

    const observer = new MutationObserver(scheduleCleanup)
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["style", "data-scroll-locked", "data-scroll-lock", "data-state"],
    })

    window.addEventListener("focus", scheduleCleanup)
    window.addEventListener("pageshow", scheduleCleanup)
    window.addEventListener("resize", scheduleCleanup)
    window.addEventListener("orientationchange", scheduleCleanup)
    document.addEventListener("visibilitychange", scheduleCleanup)

    return () => {
      observer.disconnect()
      window.removeEventListener("focus", scheduleCleanup)
      window.removeEventListener("pageshow", scheduleCleanup)
      window.removeEventListener("resize", scheduleCleanup)
      window.removeEventListener("orientationchange", scheduleCleanup)
      document.removeEventListener("visibilitychange", scheduleCleanup)
    }
  }, [pathname])

  return null
}
