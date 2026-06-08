import jsPDF from "jspdf"
import type { GeneratedQuoteData } from "@/lib/ai-quote-service"
import { getQuoteCreativeSystem } from "@/lib/righello-quote-creative-system"

type QuoteVoice = GeneratedQuoteData["voci"][number]

const BRAND = {
  primary: [30, 58, 95] as const,
  ink: [31, 41, 55] as const,
  muted: [107, 114, 128] as const,
  soft: [238, 242, 247] as const,
  bg: [245, 247, 250] as const,
  border: [209, 213, 219] as const,
  green: [34, 197, 94] as const,
  blue: [59, 130, 246] as const,
  pink: [217, 70, 239] as const,
  white: [255, 255, 255] as const,
}

type PdfColor = readonly [number, number, number]
type PdfBrand = Record<keyof typeof BRAND, PdfColor>

const mm = {
  top: 22,
  bottom: 20,
  left: 18,
  right: 18,
}

const safeNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const formatQuoteCurrency = (amount: number): string => {
  const value = safeNumber(amount)
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)

  return `€ ${formatted}`
}

export const formatQuoteCurrencyLegacy = (amount: number): string => {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  })
    .format(safeNumber(amount))
    .replace("€", "€ ")
}

export const quoteItemTotal = (item: Pick<QuoteVoice, "quantita" | "prezzoUnitario" | "totale">) => {
  const persisted = safeNumber(item.totale)
  if (persisted > 0) return persisted
  return safeNumber(item.quantita) * safeNumber(item.prezzoUnitario)
}

export const quoteDevelopmentTotal = (data: GeneratedQuoteData) => {
  const gross = baseProjectItems(data).reduce((sum, item) => sum + quoteItemTotal(item), 0)
  return Math.max(0, gross - safeNumber(data.totali.sconto))
}

export const quoteRecurringAnnualTotal = (data: GeneratedQuoteData) => {
  const annualManagement = safeNumber(data.gestioneAnnuale?.totalAnnual)
  const recurringVoices = data.voci
    .filter((item) => item.categoria === "recurring")
    .reduce((sum, item) => sum + quoteItemTotal(item), 0)
  return annualManagement + recurringVoices
}

export const quoteYearOneTotal = (data: GeneratedQuoteData) => {
  return quoteDevelopmentTotal(data) + quoteRecurringAnnualTotal(data)
}

export const quoteVatIncluded = (amount: number, iva = 22) => {
  return Math.round(amount * (1 + iva / 100) * 100) / 100
}

const baseProjectItems = (data: GeneratedQuoteData) =>
  data.voci.filter((item) => item.categoria !== "recurring" && item.categoria !== "optional")

const optionalProjectItems = (data: GeneratedQuoteData) =>
  data.voci.filter((item) => item.categoria === "optional")

const hexToPdfColor = (hex: string, fallback: PdfColor): PdfColor => {
  const normalized = hex.replace("#", "").trim()
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return fallback

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ] as const
}

const resolveQuotePdfBrand = (data: GeneratedQuoteData): PdfBrand => {
  const system = data.creativeDirection || getQuoteCreativeSystem({
    projectType: data.projectType,
    sector: data.preventivo?.settore,
    clientName: `${data.cliente?.nome || ""} ${data.cliente?.azienda || ""}`,
    description: `${data.preventivo?.titolo || ""} ${data.preventivo?.descrizione || ""}`,
  })
  const palette = system.palette

  return {
    ...BRAND,
    primary: hexToPdfColor(palette.primary, BRAND.primary),
    ink: hexToPdfColor(palette.ink, BRAND.ink),
    muted: hexToPdfColor(palette.muted, BRAND.muted),
    soft: hexToPdfColor(palette.soft, BRAND.soft),
    bg: hexToPdfColor(palette.paper, BRAND.bg),
    border: hexToPdfColor(palette.border, BRAND.border),
    green: hexToPdfColor(palette.positive, BRAND.green),
    blue: hexToPdfColor(palette.primary, BRAND.blue),
    pink: hexToPdfColor(palette.signal, BRAND.pink),
  }
}

export function validateQuotePDFData(data: GeneratedQuoteData): string[] {
  const errors: string[] = []
  const oneShotItems = baseProjectItems(data)

  if (!data.cliente?.nome?.trim()) {
    errors.push("cliente mancante")
  }
  if (!data.preventivo?.titolo?.trim()) {
    errors.push("titolo preventivo mancante")
  }
  if (oneShotItems.length < 3) {
    errors.push("servono almeno 3 voci progettuali per generare un preventivo commerciale completo")
  }

  data.voci.forEach((item) => {
    if (!item.descrizione?.trim()) {
      errors.push("voce preventivo senza descrizione")
    }
    if (quoteItemTotal(item) <= 0) {
      errors.push(`voce "${item.descrizione || "senza nome"}" con importo non valido`)
    }
  })

  const gross = oneShotItems.reduce((sum, item) => sum + quoteItemTotal(item), 0)
  const discount = safeNumber(data.totali.sconto)
  if (discount > gross * 0.3) {
    errors.push("sconto superiore al 30% del lordo: verificare prima di generare il PDF")
  }

  if (data.gestioneAnnuale?.items?.length) {
    const expectedAnnual = data.gestioneAnnuale.items.reduce((sum, item) => sum + safeNumber(item.monthly) * 12, 0)
    const declaredAnnual = safeNumber(data.gestioneAnnuale.totalAnnual)
    if (declaredAnnual > 0 && Math.abs(expectedAnnual - declaredAnnual) > 1) {
      errors.push("gestione annuale non coerente: totale annuo diverso da mensile x 12")
    }
  }

  return errors
}

class RighelloPDFGenerator {
  private doc: jsPDF
  private y = mm.top
  private brand: PdfBrand = BRAND
  private readonly width: number
  private readonly height: number
  private readonly contentWidth: number

  constructor() {
    this.doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    this.width = this.doc.internal.pageSize.width
    this.height = this.doc.internal.pageSize.height
    this.contentWidth = this.width - mm.left - mm.right
  }

  private setColor(color: readonly [number, number, number], mode: "text" | "fill" | "draw" = "text") {
    if (mode === "fill") this.doc.setFillColor(...color)
    if (mode === "draw") this.doc.setDrawColor(...color)
    if (mode === "text") this.doc.setTextColor(...color)
  }

  private sectionPage(title: string, eyebrow?: string) {
    this.doc.addPage()
    this.y = mm.top
    this.drawInternalHeader()
    if (eyebrow) this.eyebrow(eyebrow)
    this.h1(title)
    this.y += 4
  }

  private ensure(space: number) {
    if (this.y + space > this.height - mm.bottom - 12) {
      this.doc.addPage()
      this.y = mm.top
      this.drawInternalHeader()
    }
  }

  private drawInternalHeader() {
    this.setColor(this.brand.primary, "fill")
    this.doc.rect(0, 0, this.width, 4, "F")
  }

  private footer(data: GeneratedQuoteData) {
    const pages = this.doc.getNumberOfPages()
    for (let page = 2; page <= pages; page += 1) {
      this.doc.setPage(page)
      this.setColor(this.brand.border, "draw")
      this.doc.setLineWidth(0.2)
      this.doc.line(mm.left, this.height - 16, this.width - mm.right, this.height - 16)
      this.setColor(this.brand.muted)
      this.doc.setFont("helvetica", "normal")
      this.doc.setFontSize(8)
      this.doc.text("Righello", mm.left, this.height - 9)
      this.doc.text(`Proposta ${data.cliente.nome || data.preventivo.titolo}`, mm.left + 20, this.height - 9)
      this.doc.text(`Pagina ${page}`, this.width - mm.right, this.height - 9, { align: "right" })
    }
  }

  private brandMark(x: number, y: number, size = 18, color?: readonly [number, number, number]) {
    this.setColor(color || this.brand.white, "fill")
    const h = size * 0.14
    this.doc.roundedRect(x, y, size, h, 0.9, 0.9, "F")
    this.doc.roundedRect(x, y + size * 0.32, size * 0.58, h, 0.9, 0.9, "F")
    this.doc.roundedRect(x, y + size * 0.64, size, h, 0.9, 0.9, "F")
  }

  private text(text: string, x: number, y: number, opts?: { size?: number; bold?: boolean; color?: readonly [number, number, number]; maxWidth?: number; leading?: number }) {
    this.setColor(opts?.color || this.brand.ink)
    this.doc.setFont("helvetica", opts?.bold ? "bold" : "normal")
    this.doc.setFontSize(opts?.size || 10)
    const lines = this.doc.splitTextToSize(text || "-", opts?.maxWidth || this.contentWidth)
    this.doc.text(lines, x, y)
    return lines.length * (opts?.leading || 5)
  }

  private textRight(text: string, x: number, y: number, opts?: { size?: number; bold?: boolean; color?: readonly [number, number, number] }) {
    this.setColor(opts?.color || this.brand.ink)
    this.doc.setFont("helvetica", opts?.bold ? "bold" : "normal")
    this.doc.setFontSize(opts?.size || 10)
    this.doc.text(text || "-", x, y, { align: "right" })
  }

  private h1(text: string) {
    const used = this.text(text, mm.left, this.y, { size: 26, bold: true, color: this.brand.primary, leading: 9, maxWidth: this.contentWidth })
    this.y += Math.max(14, used + 6)
  }

  private h2(text: string) {
    this.ensure(12)
    this.text(text, mm.left, this.y, { size: 17, bold: true, color: this.brand.primary })
    this.y += 9
  }

  private eyebrow(text: string) {
    this.text(text.toUpperCase(), mm.left, this.y, { size: 8.5, bold: true, color: this.brand.pink })
    this.y += 7
  }

  private body(text: string, width = this.contentWidth) {
    this.ensure(12)
    const used = this.text(text, mm.left, this.y, { size: 10, color: this.brand.ink, maxWidth: width, leading: 5.4 })
    this.y += used + 5
  }

  private callout(text: string, color?: readonly [number, number, number]) {
    this.ensure(22)
    const height = Math.max(18, this.doc.splitTextToSize(text, this.contentWidth - 12).length * 5 + 9)
    this.setColor(this.brand.bg, "fill")
    this.setColor(this.brand.border, "draw")
    this.doc.roundedRect(mm.left, this.y, this.contentWidth, height, 2, 2, "FD")
    this.setColor(color || this.brand.green, "fill")
    this.doc.rect(mm.left, this.y, 2, height, "F")
    this.text(text, mm.left + 8, this.y + 8, { size: 9.5, color: this.brand.ink, maxWidth: this.contentWidth - 14 })
    this.y += height + 8
  }

  private metricCard(x: number, y: number, width: number, value: string, label: string) {
    this.setColor(this.brand.bg, "fill")
    this.setColor(this.brand.border, "draw")
    this.doc.roundedRect(x, y, width, 24, 2, 2, "FD")
    this.text(value, x + 5, y + 10, { size: 15, bold: true, color: this.brand.primary, maxWidth: width - 10 })
    this.text(label.toUpperCase(), x + 5, y + 18, { size: 7.5, color: this.brand.muted, maxWidth: width - 10 })
  }

  private priceTable(rows: Array<[string, string]>, options?: { totalLabel?: string; totalValue?: string; title?: string }) {
    if (options?.title) this.h2(options.title)
    const left = mm.left
    const col1 = this.contentWidth * 0.72
    const col2 = this.contentWidth - col1
    const headerHeight = 10
    const pageBottom = this.height - mm.bottom - 16

    const drawHeader = () => {
      this.ensure(headerHeight + 10)
      this.setColor(this.brand.primary, "fill")
      this.doc.roundedRect(left, this.y, this.contentWidth, headerHeight, 1.5, 1.5, "F")
      this.text("Voce", left + 4, this.y + 6.6, { size: 9.5, bold: true, color: this.brand.white })
      this.textRight("Importo", left + col1 + col2 - 4, this.y + 6.6, { size: 9.5, bold: true, color: this.brand.white })
      this.y += headerHeight
    }

    const drawRow = (row: [string, string], index: number, total = false) => {
      const labelLines = this.doc.splitTextToSize(row[0] || "-", col1 - 8)
      const valueLines = this.doc.splitTextToSize(row[1] || "-", col2 - 8)
      const rowHeight = Math.max(total ? 13 : 12, Math.max(labelLines.length, valueLines.length) * 4.8 + 8)

      if (this.y + rowHeight > pageBottom) {
        this.doc.addPage()
        this.y = mm.top
        this.drawInternalHeader()
        drawHeader()
      }

      this.setColor(total ? this.brand.soft : index % 2 === 0 ? this.brand.white : this.brand.soft, "fill")
      this.doc.rect(left, this.y, this.contentWidth, rowHeight, "F")
      this.setColor(this.brand.border, "draw")
      this.doc.setLineWidth(0.18)
      this.doc.line(left, this.y + rowHeight, left + this.contentWidth, this.y + rowHeight)

      this.setColor(total ? this.brand.primary : this.brand.ink)
      this.doc.setFont("helvetica", total ? "bold" : "normal")
      this.doc.setFontSize(total ? 10.5 : 9)
      this.doc.text(labelLines, left + 4, this.y + 7)
      this.doc.text(valueLines, left + col1 + col2 - 4, this.y + 7, { align: "right" })
      this.y += rowHeight
    }

    drawHeader()
    rows.forEach((row, index) => drawRow(row, index))

    if (options?.totalLabel && options.totalValue) {
      drawRow([options.totalLabel, options.totalValue], rows.length, true)
    }

    this.y += 9
  }

  private timelineRows(data: GeneratedQuoteData): Array<[string, string]> {
    const timeline = data.preventivo.timeline?.trim()
    if (!timeline) {
      return [
        ["W1-W2", "Discovery, materiali, allineamento tecnico e piano operativo"],
        ["W3-W5", "Design, sviluppo e iterazioni principali"],
        ["W6", "QA, staging, rifiniture e go-live"],
      ]
    }

    return [
      ["Fase 1", "Kick-off, raccolta materiali, perimetro e priorita operative"],
      ["Fase 2", "Design, sviluppo e iterazioni sui deliverable principali"],
      ["Fase 3", `QA, staging e consegna secondo timeline: ${timeline}`],
    ]
  }

  private checklist(items: string[], fallback: string) {
    const list = items.filter(Boolean)
    if (list.length === 0) {
      this.body(fallback)
      return
    }

    list.forEach((item) => {
      this.ensure(10)
      this.setColor(this.brand.green)
      this.doc.setFont("helvetica", "bold")
      this.doc.setFontSize(11)
      this.doc.text("✓", mm.left, this.y)
      const used = this.text(item, mm.left + 7, this.y, { size: 10, color: this.brand.ink, maxWidth: this.contentWidth - 7, leading: 5.2 })
      this.y += Math.max(7, used + 2)
    })
    this.y += 3
  }

  private drawCover(data: GeneratedQuoteData) {
    this.setColor(this.brand.white, "fill")
    this.doc.rect(0, 0, this.width, this.height, "F")

    this.setColor(this.brand.primary, "fill")
    this.doc.rect(0, 0, this.width, 66, "F")
    this.setColor(this.brand.pink, "fill")
    this.doc.rect(0, 65.2, this.width, 1.4, "F")

    this.brandMark(mm.left, 22, 15, this.brand.pink)
    this.text("RIGHELLO", mm.left + 21, 29, { size: 13, bold: true, color: this.brand.white, maxWidth: 44 })
    this.text("DESIGN, TECNOLOGIA E OPERATIONS", mm.left + 21, 36, {
      size: 6.7,
      color: [212, 220, 232],
      maxWidth: 86,
    })

    this.text("OPTIMA QUOTES", this.width - mm.right - 46, 28, {
      size: 8,
      bold: true,
      color: [212, 220, 232],
      maxWidth: 46,
    })
    this.text("Documento commerciale", this.width - mm.right - 48, 36, {
      size: 7,
      color: [174, 187, 205],
      maxWidth: 48,
    })

    const validity = data.preventivo.validitaGiorni || data.condizioni.validityDays || 60
    const development = quoteDevelopmentTotal(data)
    const recurring = quoteRecurringAnnualTotal(data)
    const yearOne = quoteYearOneTotal(data)
    const iva = data.totali.percentualeIva || 22

    this.y = 88
    this.eyebrow("proposta commerciale")
    const titleUsed = this.text(data.preventivo.titolo || "Proposta commerciale", mm.left, this.y, {
      size: 27,
      bold: true,
      color: this.brand.primary,
      maxWidth: 128,
      leading: 9.2,
    })
    this.y += titleUsed + 8
    const introUsed = this.text(
      data.preventivo.descrizione ||
        `Proposta strutturata per ${data.cliente.nome}: perimetro, costi, servizi ricorrenti e prossimi passi in un documento leggibile.`,
      mm.left,
      this.y,
      { size: 11, color: this.brand.muted, maxWidth: 137, leading: 5.8 }
    )
    this.y += introUsed + 16

    const panelX = this.width - mm.right - 58
    this.setColor([247, 249, 252], "fill")
    this.setColor([217, 224, 234], "draw")
    this.doc.roundedRect(panelX, 88, 58, 82, 2, 2, "FD")
    this.text("Totale anno 1", panelX + 6, 104, { size: 8.5, bold: true, color: this.brand.muted, maxWidth: 46 })
    this.text(formatQuoteCurrency(yearOne), panelX + 6, 119, { size: 19, bold: true, color: this.brand.primary, maxWidth: 46 })
    this.text(`Netto, IVA ${iva}% esclusa`, panelX + 6, 130, { size: 8, color: this.brand.muted, maxWidth: 46 })
    this.text("Sviluppo", panelX + 6, 146, { size: 8, color: this.brand.muted, maxWidth: 27 })
    this.text(formatQuoteCurrency(development), panelX + 55, 146, { size: 8.5, bold: true, color: this.brand.ink, maxWidth: 40 })
    this.text("Ricorrenti", panelX + 6, 158, { size: 8, color: this.brand.muted, maxWidth: 27 })
    this.text(formatQuoteCurrency(recurring), panelX + 55, 158, { size: 8.5, bold: true, color: this.brand.ink, maxWidth: 40 })

    const metaTop = 182
    const cardGap = 5
    const cardW = (this.contentWidth - cardGap * 2) / 3
    const cards = [
      ["Cliente", data.cliente.nome || "Da definire"],
      ["Fornitore", "Righello"],
      ["Validita offerta", `${validity} giorni`],
    ]
    cards.forEach(([label, value], index) => {
      const x = mm.left + (cardW + cardGap) * index
      this.setColor([247, 249, 252], "fill")
      this.setColor([225, 231, 240], "draw")
      this.doc.roundedRect(x, metaTop, cardW, 31, 2, 2, "FD")
      this.text(label, x + 5, metaTop + 10, { size: 7.8, bold: true, color: this.brand.muted, maxWidth: cardW - 10 })
      this.text(value, x + 5, metaTop + 21, { size: 10.5, bold: true, color: this.brand.primary, maxWidth: cardW - 10 })
    })

    this.setColor(this.brand.primary, "draw")
    this.doc.setLineWidth(0.35)
    this.doc.line(mm.left, 230, this.width - mm.right, 230)
    this.text("Questo documento separa sviluppo, servizi ricorrenti, opzionali e condizioni. I totali sono calcolati dalle voci del preventivo.", mm.left, 240, {
      size: 9,
      color: this.brand.muted,
      maxWidth: this.contentWidth,
      leading: 4.8,
    })
  }

  private drawExecutiveSummary(data: GeneratedQuoteData) {
    this.sectionPage("Sommario esecutivo", "Riepilogo immediato")
    const development = quoteDevelopmentTotal(data)
    const recurring = quoteRecurringAnnualTotal(data)
    const yearOne = quoteYearOneTotal(data)
    const iva = data.totali.percentualeIva || 22

    const gap = 5
    const cardWidth = (this.contentWidth - gap * 3) / 4
    const startY = this.y
    this.metricCard(mm.left, startY, cardWidth, formatQuoteCurrency(development), "Sviluppo")
    this.metricCard(mm.left + (cardWidth + gap), startY, cardWidth, formatQuoteCurrency(recurring), "Ricorrenti annui")
    this.metricCard(mm.left + (cardWidth + gap) * 2, startY, cardWidth, formatQuoteCurrency(yearOne), "Anno 1 netto")
    this.metricCard(mm.left + (cardWidth + gap) * 3, startY, cardWidth, `${data.preventivo.validitaGiorni || 60} giorni`, "Validita")
    this.y += 36

    this.body(
      `La proposta organizza il progetto "${data.preventivo.titolo}" in voci chiare, condizioni verificabili e servizi ricorrenti separati. Le voci opzionali restano fuori dal totale sviluppo finche non vengono approvate. Gli importi principali sono al netto di IVA ${iva}%.`
    )

    this.priceTable(
      [
        ["Totale sviluppo", formatQuoteCurrency(development)],
        ["Servizi ricorrenti anno 1", formatQuoteCurrency(recurring)],
        [`Totale anno 1 IVA inclusa (${iva}%)`, formatQuoteCurrency(quoteVatIncluded(yearOne, iva))],
      ],
      { totalLabel: "Totale anno 1 netto", totalValue: formatQuoteCurrency(yearOne), title: "Numeri chiave" }
    )
  }

  private drawContext(data: GeneratedQuoteData) {
    this.sectionPage("Contesto e obiettivi", "Perche questa proposta")
    this.body(
      data.preventivo.descrizione ||
        `Il progetto nasce per trasformare un'esigenza operativa in un deliverable chiaro, misurabile e governabile. La proposta separa cio che viene realizzato, cio che resta opzionale e cio che richiede gestione continuativa.`
    )
    this.h2("Obiettivi")
    this.checklist(data.obiettivi || [], "Gli obiettivi vengono definiti in fase di kick-off e riportati nel piano di lavoro operativo.")
    this.callout("La proposta non e un listino: e una base di lavoro pensata per ridurre ambiguita, scope creep e decisioni rimandate.")
  }

  private drawCreativeDirection(data: GeneratedQuoteData) {
    const direction = data.creativeDirection || getQuoteCreativeSystem({
      projectType: data.projectType,
      sector: data.preventivo?.settore,
      clientName: `${data.cliente?.nome || ""} ${data.cliente?.azienda || ""}`,
      description: `${data.preventivo?.titolo || ""} ${data.preventivo?.descrizione || ""}`,
    })

    this.sectionPage("Direzione documento", "Righello quote kit")
    this.h2(direction.label)
    this.body(`${direction.summary} ${direction.documentTone}`)
    this.callout("Il documento usa un sistema Righello: libero nella composizione, riproducibile nei dati, nei calcoli e nella verifica commerciale.")

    this.h2("Regole di composizione")
    this.checklist(direction.layoutPrinciples || [], "Gerarchia, ritmo e componenti vengono scelti in base al progetto, non da un template fisso.")

    this.h2("Ritmo editoriale")
    this.body((direction.sectionRhythm || []).join(" / ") || "Contesto / Perimetro / Economia / Condizioni / Prossimi passi")

    this.h2("Note visuali")
    this.checklist(direction.visualNotes || [], "Palette, callout e tabelle devono sostenere la decisione commerciale senza sembrare decorazione generata.")
  }

  private drawProjectSection(data: GeneratedQuoteData) {
    this.sectionPage("Sezioni progetto", "Perimetro progettuale")

    this.h2(data.preventivo.titolo || "Progetto")
    this.body("Le attivita sono organizzate per rendere leggibile cosa viene consegnato, cosa resta fuori perimetro e quali voci sono opzionali.")

    this.h2("Funzionalita chiave")
    this.checklist(data.attivita || [], "Funzionalita e deliverable vengono confermati nel documento operativo di avvio progetto.")

    this.h2("Perimetro incluso")
    const included = baseProjectItems(data).map((item) => item.descrizione)
    this.checklist(included, "Perimetro da completare prima della consegna commerciale.")

    this.h2("Non incluso")
    this.checklist(
      [
        "Hosting, licenze software e costi di terze parti se non indicati nelle voci.",
        "Copywriting, traduzioni e produzione materiali non specificati nel perimetro.",
        "Richieste sostanziali successive all'approvazione del perimetro.",
      ],
      ""
    )

    const optionalRows = optionalProjectItems(data)
      .map((item) => [item.descrizione, formatQuoteCurrency(quoteItemTotal(item))] as [string, string])
    if (optionalRows.length > 0) {
      this.priceTable(optionalRows, { title: "Voci opzionali" })
    }

    const baseItems = baseProjectItems(data)
    const grossRows = baseItems.map((item) => [item.descrizione, formatQuoteCurrency(quoteItemTotal(item))] as [string, string])
    const gross = baseItems.reduce((sum, item) => sum + quoteItemTotal(item), 0)
    if (safeNumber(data.totali.sconto) > 0) {
      grossRows.push(["Sconto commerciale", `-${formatQuoteCurrency(safeNumber(data.totali.sconto))}`])
    }
    this.priceTable(grossRows, {
      title: "Quotazione dettagliata",
      totalLabel: "Totale sviluppo",
      totalValue: formatQuoteCurrency(Math.max(0, gross - safeNumber(data.totali.sconto))),
    })
  }

  private drawRecurring(data: GeneratedQuoteData) {
    this.sectionPage("Servizi ricorrenti", "Post-vendita")
    this.body("La gestione continuativa viene separata dallo sviluppo per rendere chiaro cosa appartiene al progetto e cosa sostiene il prodotto dopo il rilascio.")

    const rows: Array<[string, string]> = []
    data.gestioneAnnuale?.items?.forEach((item) => {
      rows.push([`${item.description} (${formatQuoteCurrency(item.monthly)}/mese)`, formatQuoteCurrency(item.annual)])
    })
    data.voci
      .filter((item) => item.categoria === "recurring")
      .forEach((item) => rows.push([item.descrizione, formatQuoteCurrency(quoteItemTotal(item))]))

    if (rows.length === 0) {
      this.callout("Nessun pacchetto ricorrente e stato inserito. Supporto, manutenzione e SLA possono essere quotati come opzione separata.")
    } else {
      this.priceTable(rows, {
        title: "Pacchetto manutenzione e supporto",
        totalLabel: "Totale ricorrente annuo",
        totalValue: formatQuoteCurrency(quoteRecurringAnnualTotal(data)),
      })
    }

    this.h2("Supporto")
    this.checklist(
      [
        "Canale principale: email o workspace condiviso.",
        "Orario standard: lun-ven 09:00-17:00, esclusi festivi.",
        "Ore extra e nuove evolutive vengono quotate separatamente.",
      ],
      ""
    )
  }

  private drawEconomicRecap(data: GeneratedQuoteData) {
    this.sectionPage("Riepilogo economico", "Totali finali")
    const development = quoteDevelopmentTotal(data)
    const recurring = quoteRecurringAnnualTotal(data)
    const yearOne = quoteYearOneTotal(data)
    const iva = data.totali.percentualeIva || 22

    this.priceTable(
      [
        [data.preventivo.titolo || "Sviluppo progetto", formatQuoteCurrency(development)],
        ["Manutenzione e servizi ricorrenti anno 1", formatQuoteCurrency(recurring)],
        [`Totale anno 1 IVA inclusa (${iva}%)`, formatQuoteCurrency(quoteVatIncluded(yearOne, iva))],
      ],
      { totalLabel: "TOTALE ANNO 1 NETTO", totalValue: formatQuoteCurrency(yearOne) }
    )

    this.callout(`Tutti gli importi sono espressi al netto di IVA ${iva}%. Eventuali sconti sono gia inclusi nei totali esposti.`)

    if (safeNumber(data.totali.sconto) > 0) {
      this.priceTable(
        [["Sconto applicato", `${formatQuoteCurrency(safeNumber(data.totali.sconto))} - sconto commerciale dedicato`]],
        { title: "Scontistica applicata" }
      )
    }
  }

  private drawConditions(data: GeneratedQuoteData) {
    this.sectionPage("Condizioni", "Termini operativi")
    this.h2("Modalita di pagamento")
    this.checklist(
      [data.condizioni.paymentTerms || "30% alla firma, 40% consegna staging, 30% go-live."],
      "Modalita di pagamento da concordare prima della firma."
    )

    this.h2("Timeline")
    this.priceTable(this.timelineRows(data), {})

    this.h2("Validita offerta")
    this.body(`${data.preventivo.validitaGiorni || data.condizioni.validityDays || 60} giorni dalla data di consegna del documento.`)

    this.h2("Proprieta intellettuale")
    this.body("Il codice e i deliverable custom passano al cliente a saldo completato. Librerie open source e servizi terzi mantengono le rispettive licenze.")
  }

  private drawMaterials(data: GeneratedQuoteData) {
    const brand = data.brandMateriali
    const logoLabels: Record<string, string> = {
      available: "Logo disponibile",
      to_request: "Logo da richiedere prima dell'avvio",
      not_defined: "Logo o identita ancora da definire",
    }
    const brandNames = brand?.brandCoinvolti?.filter(Boolean) || []
    const missingMaterials = brand?.materialiDaRichiedere?.filter(Boolean) || []
    const openQuestions = brand?.domandeAperte?.filter(Boolean) || []

    this.sectionPage("Materiali e contatti", "Prossimi passi")
    this.h2("Asset brand")
    if (brand?.brandPrincipale || brandNames.length > 0) {
      this.body(
        [
          brand?.brandPrincipale ? `Brand principale: ${brand.brandPrincipale}.` : "",
          brandNames.length > 0 ? `Brand coinvolti: ${brandNames.join(", ")}.` : "",
        ].filter(Boolean).join(" ")
      )
    }

    this.checklist(
      [
        `${logoLabels[brand?.statoLogo || "to_request"] || logoLabels.to_request}${brand?.noteLogo ? `: ${brand.noteLogo}` : "."}`,
        brand?.materialiDisponibili ? `Materiali disponibili: ${brand.materialiDisponibili}` : "",
        brand?.riferimenti ? `Direzione visiva e reference: ${brand.riferimenti}` : "",
      ],
      ""
    )

    this.h2("Materiali da richiedere")
    this.checklist(
      missingMaterials.length > 0
        ? missingMaterials
        : [
            "Logo vettoriale o PNG ad alta risoluzione.",
            "Foto, video e testi ufficiali da usare nel progetto.",
            "Brand guideline, palette e vincoli di comunicazione.",
            "Accessi tecnici necessari alle integrazioni concordate.",
          ],
      ""
    )

    this.h2("Domande aperte")
    this.checklist(
      openQuestions.length > 0
        ? openQuestions
        : [
            "Chi approva contenuti, design e messa online?",
            "Quali brand, prodotti o servizi devono avere priorita?",
            "Esistono vincoli legali, privacy o claim da rispettare?",
          ],
      ""
    )

    this.h2("Contatti")
    this.body(`Righello segue la proposta e coordina l'avvio operativo con ${data.cliente.nome}.`)
    if (data.cliente.email) {
      this.body(`Referente cliente: ${data.cliente.email}`)
    }
  }

  public generatePDF(data: GeneratedQuoteData): jsPDF {
    const errors = validateQuotePDFData(data)
    if (errors.length > 0) {
      throw new Error(`Preventivo non valido: ${errors.join("; ")}`)
    }

    this.brand = resolveQuotePdfBrand(data)
    this.drawCover(data)
    this.drawExecutiveSummary(data)
    this.drawContext(data)
    this.drawCreativeDirection(data)
    this.drawProjectSection(data)
    this.drawRecurring(data)
    this.drawEconomicRecap(data)
    this.drawConditions(data)
    this.drawMaterials(data)
    this.footer(data)

    const pageCount = this.doc.getNumberOfPages()
    if (pageCount > 20) {
      throw new Error(`Preventivo troppo lungo: ${pageCount} pagine. Ridurre contenuti o sezioni.`)
    }

    console.info("[Optima quote PDF]", {
      checks: [
        "9 sezioni presenti",
        "totali derivati dalle voci",
        "riepilogo economico presente a pagina 2 e nella sezione finale",
        "direzione documento risolta dal Righello quote kit",
        "copertina senza data assoluta",
        "condizioni e materiali presenti",
      ],
      pages: pageCount,
      developmentTotal: quoteDevelopmentTotal(data),
      yearOneTotal: quoteYearOneTotal(data),
    })

    return this.doc
  }
}

export const generateQuotePDF = (data: GeneratedQuoteData): jsPDF => {
  const generator = new RighelloPDFGenerator()
  return generator.generatePDF(data)
}

export const downloadQuotePDF = (data: GeneratedQuoteData, filename?: string): void => {
  const pdf = generateQuotePDF(data)
  const safeClient = (data.cliente.nome || "Cliente").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "")
  const defaultFilename = `Proposta_${safeClient}_${data.preventivo.numeroPreventivo || "v1"}.pdf`
  pdf.save(filename || defaultFilename)
}

export const getQuotePDFBlob = (data: GeneratedQuoteData): Blob => {
  const pdf = generateQuotePDF(data)
  return pdf.output("blob")
}

export const getQuotePDFDataURL = (data: GeneratedQuoteData): string => {
  const pdf = generateQuotePDF(data)
  return pdf.output("datauristring")
}
