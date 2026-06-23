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
  "overscrollBehaviorX",
  "position",
  "top",
  "left",
  "right",
  "width",
  "height",
  "pointerEvents",
] as const

// 2026-06-23: lock sticky sul MacBook trackpad.
// Quando un dialog (Radix Dialog / Sheet / CommandBar) viene chiuso in modo
// anomalo, può capitare che `data-scroll-locked` o `position: fixed` restino
// sul <body> mentre un `overscroll-behavior: auto` viene impostato inline sul
// <html>. Questo produce il classico "rubber-band" del trackpad Mac: la
// pagina sembra scrollare elasticamente senza muoversi davvero. Qui di
// seguito definiamo i default difensivi che il guard ripristina ad ogni
// cambio route, ogni mutazione DOM e ogni interazione di scroll.
const DEFAULT_OVERSCROLL_Y = "contain"
const DEFAULT_TOUCH_ACTION = "pan-x pan-y"

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
      ].join(","),
    ),
  ).some((element) => isVisibleBlockingLayer(element))
}

function enforceOverscrollDefaults() {
  if (typeof document === "undefined") return

  const html = document.documentElement
  const body = document.body

  // Se un dialog sta bloccando lo scroll, lasciamo che gestisca lui
  // l'overscroll-behavior (Radix imposta `contain` quando serve). Altrimenti
  // blindiamo html e body al default `contain` per evitare il bounce.
  if (hasOpenBlockingLayer()) return

  const htmlOverscroll = html.style.overscrollBehaviorY
  if (htmlOverscroll && htmlOverscroll !== DEFAULT_OVERSCROLL_Y) {
    html.style.overscrollBehaviorY = DEFAULT_OVERSCROLL_Y
  }

  const bodyOverscroll = body.style.overscrollBehaviorY
  if (bodyOverscroll && bodyOverscroll !== DEFAULT_OVERSCROLL_Y) {
    body.style.overscrollBehaviorY = DEFAULT_OVERSCROLL_Y
  }

  // Touch-action: garantisce che il pinch-zoom e lo scroll nativo non vadano
  // in conflitto su trackpad/touchscreen, una delle cause note del bounce.
  const htmlTouchAction = html.style.touchAction
  if (htmlTouchAction && htmlTouchAction !== DEFAULT_TOUCH_ACTION) {
    html.style.touchAction = DEFAULT_TOUCH_ACTION
  }
}

function clearStaleScrollLock() {
  if (typeof document === "undefined") return
  if (hasOpenBlockingLayer()) {
    enforceOverscrollDefaults()
    return
  }

  const { body, documentElement } = document
  const bodyLooksLocked =
    body.hasAttribute("data-scroll-locked") ||
    body.style.overflow === "hidden" ||
    body.style.position === "fixed" ||
    documentElement.style.overflow === "hidden" ||
    body.style.pointerEvents === "none"

  if (!bodyLooksLocked) {
    enforceOverscrollDefaults()
    return
  }

  const lockedTop = body.style.position === "fixed" ? Number.parseInt(body.style.top || "0", 10) : 0

  body.removeAttribute("data-scroll-locked")
  body.removeAttribute("data-scroll-lock")
  LOCKED_BODY_STYLES.forEach((property) => {
    body.style[property] = ""
  })
  LOCKED_DOCUMENT_STYLES.forEach((property) => {
    documentElement.style[property] = ""
  })

  enforceOverscrollDefaults()

  if (lockedTop < 0) {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: Math.abs(lockedTop) })
    })
  }
}

export function ScrollStabilityGuard() {
  const pathname = usePathname()

  useEffect(() => {
    // Prima passata: applichiamo i default difensivi sul viewport, anche se
    // non c'è nessun lock da pulire. Utile dopo reload/SSR-idratazione.
    enforceOverscrollDefaults()

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
      attributeFilter: [
        "style",
        "data-scroll-locked",
        "data-scroll-lock",
        "data-state",
      ],
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
      document.removeEventListener("visibilitychange", scheduleCleanup)
    }
  }, [pathname])

  return null
}
