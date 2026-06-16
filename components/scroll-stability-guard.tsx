"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const LOCKED_BODY_STYLES = [
  "overflow",
  "paddingRight",
  "marginRight",
  "pointerEvents",
  "position",
  "top",
  "left",
  "right",
  "width",
  "height",
] as const
const LOCKED_DOCUMENT_STYLES = [
  "overflow",
  "overscrollBehavior",
  "overscrollBehaviorY",
  "position",
  "top",
  "left",
  "right",
  "width",
  "height",
  "pointerEvents",
] as const

function isVisibleBlockingLayer(element: Element) {
  if (!(element instanceof HTMLElement)) return false
  if (element.getAttribute("aria-hidden") === "true") return false

  const style = window.getComputedStyle(element)
  if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") {
    return false
  }

  return element.getClientRects().length > 0
}

function hasOpenBlockingLayer() {
  if (typeof document === "undefined") return true

  return Array.from(
    document.querySelectorAll(
      [
        '[role="dialog"][data-state="open"]',
        '[role="alertdialog"][data-state="open"]',
        '[data-sidebar="sidebar"][data-mobile="true"][data-state="open"]',
      ].join(",")
    )
  ).some((element) =>
    isVisibleBlockingLayer(element)
  )
}

function clearStaleScrollLock() {
  if (typeof document === "undefined") return
  if (hasOpenBlockingLayer()) return

  const { body, documentElement } = document
  const bodyLooksLocked =
    body.hasAttribute("data-scroll-locked") ||
    body.style.overflow === "hidden" ||
    body.style.position === "fixed" ||
    documentElement.style.overflow === "hidden" ||
    body.style.pointerEvents === "none"

  if (!bodyLooksLocked) return

  const lockedTop = body.style.position === "fixed" ? Number.parseInt(body.style.top || "0", 10) : 0

  body.removeAttribute("data-scroll-locked")
  body.removeAttribute("data-scroll-lock")
  LOCKED_BODY_STYLES.forEach((property) => {
    body.style[property] = ""
  })
  LOCKED_DOCUMENT_STYLES.forEach((property) => {
    documentElement.style[property] = ""
  })

  if (lockedTop < 0) {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: Math.abs(lockedTop) })
    })
  }
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
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "data-scroll-locked", "data-scroll-lock"],
    })

    window.addEventListener("focus", scheduleCleanup)
    window.addEventListener("pageshow", scheduleCleanup)
    window.addEventListener("resize", scheduleCleanup)
    window.addEventListener("orientationchange", scheduleCleanup)
    window.addEventListener("wheel", scheduleCleanup, { passive: true })
    window.addEventListener("pointerdown", scheduleCleanup, { passive: true })
    window.addEventListener("touchstart", scheduleCleanup, { passive: true })
    window.addEventListener("touchmove", scheduleCleanup, { passive: true })
    window.addEventListener("scroll", scheduleCleanup, { passive: true })
    document.addEventListener("visibilitychange", scheduleCleanup)

    return () => {
      observer.disconnect()
      window.removeEventListener("focus", scheduleCleanup)
      window.removeEventListener("pageshow", scheduleCleanup)
      window.removeEventListener("resize", scheduleCleanup)
      window.removeEventListener("orientationchange", scheduleCleanup)
      window.removeEventListener("wheel", scheduleCleanup)
      window.removeEventListener("pointerdown", scheduleCleanup)
      window.removeEventListener("touchstart", scheduleCleanup)
      window.removeEventListener("touchmove", scheduleCleanup)
      window.removeEventListener("scroll", scheduleCleanup)
      document.removeEventListener("visibilitychange", scheduleCleanup)
    }
  }, [pathname])

  return null
}
