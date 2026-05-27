"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "optima-financial-reveal-until"
const REVEAL_DURATION_MS = 5 * 60 * 1000
const MONEY_PATTERN =
  /(?:[$€£¥]|(?:\b(?:EUR|USD|CHF|GBP)\b)|(?:\b\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{1,2})?\s?(?:€|eur|usd|chf|gbp)\b)|(?:\b(?:euro|dollari)\b))/i

const BLOCKED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "NOSCRIPT",
  "CODE",
  "PRE",
])

function formatTimer(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function shouldMarkTextNode(node: Text) {
  const parent = node.parentElement
  const text = node.nodeValue?.trim() || ""

  if (!parent || text.length < 2 || !MONEY_PATTERN.test(text)) return false
  if (BLOCKED_TAGS.has(parent.tagName)) return false
  if (parent.closest("[data-financial-privacy-control]")) return false
  if (parent.closest("[data-financial-plain]")) return false
  if (parent.classList.contains("financial-sensitive")) return false

  return true
}

function markFinancialValues(root: ParentNode = document.body) {
  if (typeof document === "undefined") return

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldMarkTextNode(node as Text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    },
  })

  const targets = new Set<HTMLElement>()
  let current = walker.nextNode()

  while (current) {
    const parent = current.parentElement
    if (parent) targets.add(parent)
    current = walker.nextNode()
  }

  targets.forEach((target) => {
    target.classList.add("financial-sensitive")
    target.setAttribute("data-financial-sensitive", "true")
  })
}

export function FinancialPrivacyProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState(() => Date.now())
  const [revealUntil, setRevealUntil] = useState(0)

  const isVisible = revealUntil > now
  const remainingMs = Math.max(0, revealUntil - now)

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)
    const storedRevealUntil = storedValue ? Number(storedValue) : 0

    if (Number.isFinite(storedRevealUntil) && storedRevealUntil > Date.now()) {
      setRevealUntil(storedRevealUntil)
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.financialVisible = isVisible ? "true" : "false"

    if (!isVisible && revealUntil > 0) {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [isVisible, revealUntil])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const scheduleMarking = () => window.requestAnimationFrame(() => markFinancialValues())

    scheduleMarking()

    const observer = new MutationObserver((mutations) => {
      const shouldScan = mutations.some((mutation) => mutation.addedNodes.length > 0 || mutation.type === "characterData")
      if (shouldScan) scheduleMarking()
    })

    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  const reveal = useCallback(() => {
    const nextRevealUntil = Date.now() + REVEAL_DURATION_MS
    setNow(Date.now())
    setRevealUntil(nextRevealUntil)
    window.localStorage.setItem(STORAGE_KEY, String(nextRevealUntil))
  }, [])

  const hide = useCallback(() => {
    setRevealUntil(0)
    window.localStorage.removeItem(STORAGE_KEY)
  }, [])

  const label = useMemo(() => {
    if (!isVisible) return "Mostra importi"
    return `Visibili ${formatTimer(remainingMs)}`
  }, [isVisible, remainingMs])

  return (
    <>
      {children}
      <div
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-3 z-[90] flex max-w-[calc(100vw-1.5rem)] items-center gap-2 sm:right-4 sm:max-w-[calc(100vw-2rem)]"
        data-financial-privacy-control
      >
        <div className="hidden rounded-md border border-white/10 bg-black/75 px-3 py-2 text-xs leading-tight text-slate-200 shadow-2xl backdrop-blur-xl sm:block">
          <div className="flex items-center gap-2 font-semibold text-white">
            <ShieldCheck className="h-3.5 w-3.5 text-righello-cyan" />
            Vista interna protetta
          </div>
          <div className="text-slate-400">{isVisible ? "Auto-censura tra 5 minuti." : "Prezzi e costi censurati."}</div>
        </div>
        <Button
          type="button"
          onClick={isVisible ? hide : reveal}
          className={cn(
            "h-11 min-w-11 rounded-md border border-white/10 px-0 shadow-2xl backdrop-blur-xl sm:px-4",
            isVisible
              ? "bg-slate-950 text-white hover:bg-slate-900"
              : "bg-righello-pink text-white hover:bg-righello-pink/90"
          )}
          aria-live="polite"
          title={label}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </div>
    </>
  )
}
