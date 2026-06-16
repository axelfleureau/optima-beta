export interface QuoteClientLike {
  nome?: string
  email?: string
  azienda?: string
  telefono?: string
  indirizzo?: string
  partitaIva?: string
}

export interface QuoteDataQuality {
  status: "complete" | "needs_review" | "blocked"
  warnings: string[]
  missingClientFields: string[]
  placeholderFields: string[]
}

const SAMPLE_EMAIL_DOMAINS = new Set(["example.com", "example.it", "example.org", "test.com", "test.it"])
const SAMPLE_TEXT_PATTERNS = [
  /\bplaceholder\b/i,
  /\blorem\b/i,
  /\bmock\b/i,
  /\bfake\b/i,
  /\btest\b/i,
  /\besempio\b/i,
]

const clean = (value?: string) => value?.trim() || ""

export function isMockContactValue(value?: string): boolean {
  const text = clean(value)
  if (!text) return false

  const emailMatch = text.match(/^[^@\s]+@([^@\s]+\.[^@\s]+)$/)
  if (emailMatch && SAMPLE_EMAIL_DOMAINS.has(emailMatch[1].toLowerCase())) {
    return true
  }

  return SAMPLE_TEXT_PATTERNS.some((pattern) => pattern.test(text))
}

export function sanitizeQuoteClient<T extends QuoteClientLike>(client: T): T {
  const next = { ...client }
  ;(["email", "telefono", "indirizzo", "partitaIva"] as const).forEach((field) => {
    if (isMockContactValue(next[field])) {
      next[field] = "" as T[typeof field]
    }
  })
  return next
}

export function getQuoteClientDataQuality(client: QuoteClientLike): QuoteDataQuality {
  const sanitized = sanitizeQuoteClient(client)
  const missingClientFields: string[] = []
  const placeholderFields: string[] = []
  const warnings: string[] = []

  if (!clean(sanitized.nome)) missingClientFields.push("nome cliente")
  if (!clean(sanitized.email)) missingClientFields.push("email cliente")
  if (!clean(sanitized.azienda)) missingClientFields.push("azienda/ragione sociale")

  ;(["email", "telefono", "indirizzo", "partitaIva"] as const).forEach((field) => {
    if (isMockContactValue(client[field])) placeholderFields.push(field)
  })

  if (placeholderFields.length > 0) {
    warnings.push(`Rimossi dati fittizi: ${placeholderFields.join(", ")}.`)
  }
  if (missingClientFields.includes("email cliente")) {
    warnings.push("Email cliente mancante: il documento resta bozza finche non viene inserito un contatto reale.")
  }
  if (missingClientFields.includes("azienda/ragione sociale")) {
    warnings.push("Azienda o ragione sociale mancante: verifica prima di inviare o firmare il preventivo.")
  }

  const status = missingClientFields.includes("nome cliente")
    ? "blocked"
    : warnings.length > 0 || missingClientFields.length > 0
      ? "needs_review"
      : "complete"

  return {
    status,
    warnings,
    missingClientFields,
    placeholderFields,
  }
}

export function applyQuoteClientDataQuality<T extends { cliente: QuoteClientLike; dataQuality?: QuoteDataQuality }>(quote: T): T {
  const sanitizedClient = sanitizeQuoteClient(quote.cliente)
  const dataQuality = getQuoteClientDataQuality(sanitizedClient)
  return {
    ...quote,
    cliente: sanitizedClient,
    dataQuality,
  }
}
