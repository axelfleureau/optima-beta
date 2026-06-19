export interface QuoteCommercialContext {
  selectedPackageId?: string
  pricingTemplateId?: string
  projectTypeLabel?: string
  projectType?: string
  sector?: string
  sectorLabel?: string
  complexity?: string
  budgetRange?: { min?: number; max?: number }
  timeline?: string
}

export interface QuoteSourceSnapshot {
  quoteContext?: QuoteCommercialContext
  [key: string]: unknown
}

const TEMPLATE_TITLE_LEAK = /\b(?:A\s*(?:180|360)\s*°|Base\/Semplificato|Avanzato\/Integrazioni)\b/i

export function extractQuoteCommercialContext(snapshot: unknown): QuoteCommercialContext {
  if (!snapshot || typeof snapshot !== "object") return {}
  const source = snapshot as QuoteSourceSnapshot
  const context = source.quoteContext && typeof source.quoteContext === "object"
    ? source.quoteContext
    : source

  return {
    selectedPackageId: typeof context.selectedPackageId === "string" ? context.selectedPackageId : undefined,
    pricingTemplateId: typeof context.pricingTemplateId === "string" ? context.pricingTemplateId : undefined,
    projectTypeLabel: typeof context.projectTypeLabel === "string" ? context.projectTypeLabel : undefined,
    projectType: typeof context.projectType === "string" ? context.projectType : undefined,
    sector: typeof context.sector === "string" ? context.sector : undefined,
    sectorLabel: typeof context.sectorLabel === "string" ? context.sectorLabel : undefined,
    complexity: typeof context.complexity === "string" ? context.complexity : undefined,
    budgetRange:
      context.budgetRange && typeof context.budgetRange === "object"
        ? context.budgetRange
        : undefined,
    timeline: typeof context.timeline === "string" ? context.timeline : undefined,
  }
}

export function buildQuoteSourceSnapshot(context: QuoteCommercialContext): QuoteSourceSnapshot {
  return {
    type: "optima_quote_generation_context",
    version: 1,
    quoteContext: {
      selectedPackageId: context.selectedPackageId,
      pricingTemplateId: context.pricingTemplateId,
      projectTypeLabel: context.projectTypeLabel,
      projectType: context.projectType,
      sector: context.sector,
      sectorLabel: context.sectorLabel,
      complexity: context.complexity,
      budgetRange: context.budgetRange,
      timeline: context.timeline,
    },
  }
}

export function resolveQuoteDisplayTitle(input: {
  title?: string
  clientName?: string
  sourceSnapshot?: unknown
}): string {
  const title = input.title?.trim() || ""
  const context = extractQuoteCommercialContext(input.sourceSnapshot)
  const label = context.projectTypeLabel?.trim()
  const selectedId = context.selectedPackageId?.trim()
  const pricingId = context.pricingTemplateId?.trim()

  if (!title) {
    return label ? `${label} per ${input.clientName || "Cliente"}` : "Preventivo"
  }

  const selectedDiffersFromPricing = Boolean(selectedId && pricingId && selectedId !== pricingId)
  const leaksInternalTemplate = TEMPLATE_TITLE_LEAK.test(title)
  const titleAlreadyUsesLabel = Boolean(label && title.toLowerCase().includes(label.toLowerCase()))

  if (label && !titleAlreadyUsesLabel && (leaksInternalTemplate || selectedDiffersFromPricing)) {
    return `${label} per ${input.clientName || "Cliente"}`
  }

  return title
}
