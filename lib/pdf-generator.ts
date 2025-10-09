// PDF Generation Service using jsPDF for better compatibility
import jsPDF from 'jspdf'
import type { GeneratedQuoteData } from '@/lib/ai-quote-service'

// Righello Brand Colors - Corporate Palette
const COLORS = {
  primary: '#D946EF', // Pink Righello
  secondary: '#9333EA', // Purple
  dark: '#1F2937',
  light: '#F9FAFB',
  accent: '#EC4899',
  border: '#E5E7EB',
  text: '#374151',
  textLight: '#6B7280',
  success: '#10B981'
}

// Helper functions
const formatCurrency = (amount: number): string => {
  return `€${amount.toFixed(2).replace('.', ',')}`
}

const generateItemCode = (index: number, categoria: string): string => {
  const prefix = categoria === 'base' ? 'RIG' : categoria === 'optional' ? 'OPT' : 'REC'
  return `${prefix}-${String(index + 1).padStart(3, '0')}`
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('it-IT')
}

export class RighelloPDFGenerator {
  private doc: jsPDF
  private currentY: number
  private margin: number = 20
  private pageWidth: number
  private pageHeight: number

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    this.pageWidth = this.doc.internal.pageSize.width
    this.pageHeight = this.doc.internal.pageSize.height
    this.currentY = this.margin
  }

  private addNewPageIfNeeded(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.doc.addPage()
      this.currentY = this.margin
    }
  }

  private drawHeader(data: GeneratedQuoteData): void {
    // Gradient-like header background (pink)
    this.doc.setFillColor(212, 70, 239) // Pink
    this.doc.rect(0, 0, this.pageWidth, 40, 'F')
    
    // Draw Righello Logo (3 white rectangles on pink background)
    const logoX = this.margin
    const logoY = 10
    const logoWidth = 25
    const logoHeight = 5
    const logoSpacing = 7
    
    this.doc.setFillColor(255, 255, 255) // White rectangles
    
    // Top rectangle
    this.doc.roundedRect(logoX, logoY, logoWidth, logoHeight, 1, 1, 'F')
    
    // Middle rectangle (shorter)
    this.doc.roundedRect(logoX, logoY + logoSpacing, logoWidth * 0.6, logoHeight, 1, 1, 'F')
    
    // Bottom rectangle
    this.doc.roundedRect(logoX, logoY + (logoSpacing * 2), logoWidth, logoHeight, 1, 1, 'F')
    
    // Brand text (white on pink)
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255) // White
    this.doc.text('RIGHELLO', logoX + logoWidth + 5, logoY + 8)
    
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('We Are Digital', logoX + logoWidth + 5, logoY + 15)
    
    // Quote info (right aligned, white)
    const rightMargin = this.pageWidth - this.margin
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('PREVENTIVO', rightMargin, 20, { align: 'right' })
    
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(data.preventivo.numeroPreventivo, rightMargin, 28, { align: 'right' })
    this.doc.text(formatDate(data.preventivo.dataCreazione), rightMargin, 34, { align: 'right' })
    
    this.currentY = 50 // After header
  }

  private drawProjectTypeHeader(projectType: string): void {
    this.addNewPageIfNeeded(20)
    
    // Template badge configuration
    const templates: Record<string, { label: string; color: [number, number, number] }> = {
      website_180: { label: 'Website 180°', color: [147, 51, 234] }, // Purple
      website_360: { label: 'Website 360°', color: [212, 70, 239] }, // Pink
      video_production: { label: 'Video Production', color: [236, 72, 153] }, // Rose
      communication_150: { label: 'Comunicazione 150°', color: [124, 58, 237] },
      communication_180: { label: 'Comunicazione 180°', color: [139, 92, 246] },
    }
    
    const template = templates[projectType] || { label: projectType, color: [100, 100, 100] as [number, number, number] }
    
    // Badge background
    this.doc.setFillColor(...template.color)
    this.doc.roundedRect(this.margin, this.currentY, 60, 10, 2, 2, 'F')
    
    // Badge text
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text(template.label.toUpperCase(), this.margin + 3, this.currentY + 7)
    
    // Reset text color
    this.doc.setTextColor(0, 0, 0)
    this.currentY += 15
  }

  private drawTitle(data: GeneratedQuoteData): void {
    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(31, 41, 55) // Dark gray
    this.doc.text(data.preventivo.titolo, this.margin, this.currentY)
    this.currentY += 15
  }

  private drawClientInfo(data: GeneratedQuoteData): void {
    // Background rectangle
    this.doc.setFillColor(243, 244, 246) // Light gray
    this.doc.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 35, 'F')

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(31, 41, 55)
    this.doc.text('INFORMAZIONI CLIENTE', this.margin + 5, this.currentY + 5)

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    
    let leftY = this.currentY + 15
    const centerX = this.pageWidth / 2

    // Left column
    this.doc.text(`Cliente: ${data.cliente.nome}`, this.margin + 5, leftY)
    if (data.cliente.azienda) {
      this.doc.text(`Azienda: ${data.cliente.azienda}`, this.margin + 5, leftY + 6)
      leftY += 6
    }
    if (data.cliente.email) {
      this.doc.text(`Email: ${data.cliente.email}`, this.margin + 5, leftY + 6)
    }

    // Right column
    let rightY = this.currentY + 15
    if (data.cliente.telefono) {
      this.doc.text(`Telefono: ${data.cliente.telefono}`, centerX, rightY)
      rightY += 6
    }
    if (data.cliente.partitaIva) {
      this.doc.text(`P.IVA: ${data.cliente.partitaIva}`, centerX, rightY)
      rightY += 6
    }
    if (data.preventivo.settore) {
      this.doc.text(`Settore: ${data.preventivo.settore}`, centerX, rightY)
    }

    this.currentY += 45
  }

  private drawProjectDescription(data: GeneratedQuoteData): void {
    if (!data.preventivo.descrizione) return

    this.addNewPageIfNeeded(30)
    
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('DESCRIZIONE PROGETTO', this.margin, this.currentY)
    this.currentY += 8

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    
    const lines = this.doc.splitTextToSize(data.preventivo.descrizione, this.pageWidth - 2 * this.margin)
    this.doc.text(lines, this.margin, this.currentY)
    this.currentY += lines.length * 5 + 10
  }

  private drawItemsTable(data: GeneratedQuoteData): void {
    this.addNewPageIfNeeded(50)

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(31, 41, 55)
    this.doc.text('DETTAGLIO SERVIZI', this.margin, this.currentY)
    this.currentY += 10

    // Table headers
    const tableWidth = this.pageWidth - 2 * this.margin
    const colWidths = {
      code: tableWidth * 0.15,
      description: tableWidth * 0.45,
      quantity: tableWidth * 0.10,
      price: tableWidth * 0.15,
      total: tableWidth * 0.15
    }

    // Header background with borders
    this.doc.setFillColor(249, 250, 251) // Light gray
    this.doc.rect(this.margin, this.currentY, tableWidth, 10, 'F')
    
    // Header borders
    this.doc.setDrawColor(229, 231, 235)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.doc.line(this.margin, this.currentY + 10, this.pageWidth - this.margin, this.currentY + 10)

    // Header text
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(55, 65, 81)
    
    let headerX = this.margin + 2
    this.doc.text('CODICE', headerX, this.currentY + 7)
    headerX += colWidths.code
    this.doc.text('DESCRIZIONE', headerX, this.currentY + 7)
    headerX += colWidths.description
    this.doc.text('Q.TÀ', headerX, this.currentY + 7)
    headerX += colWidths.quantity
    this.doc.text('PREZZO', headerX, this.currentY + 7)
    headerX += colWidths.price
    this.doc.text('TOTALE', headerX, this.currentY + 7)

    this.currentY += 12

    // Table rows
    this.doc.setFont('helvetica', 'normal')

    data.voci.forEach((voce, index) => {
      // Calculate required space for this row based on description lines
      const descLines = this.doc.splitTextToSize(voce.descrizione, colWidths.description - 4)
      const lineHeight = 4
      const minRowHeight = 8
      const rowHeight = Math.max(minRowHeight, descLines.length * lineHeight + 4)
      
      // Check if we need a new page for this row
      this.addNewPageIfNeeded(rowHeight + 2)

      // Alternating row colors
      if (index % 2 === 0) {
        this.doc.setFillColor(249, 250, 251) // Light gray
        this.doc.rect(this.margin, this.currentY, tableWidth, rowHeight, 'F')
      }

      let rowX = this.margin + 2
      const rowY = this.currentY + 4

      this.doc.setFontSize(9)
      this.doc.setTextColor(55, 65, 81)

      // Code column
      this.doc.text(generateItemCode(index, voce.categoria), rowX, rowY + 2)
      rowX += colWidths.code

      // Description column - render ALL lines
      descLines.forEach((line: string, lineIndex: number) => {
        this.doc.text(line, rowX, rowY + 2 + (lineIndex * lineHeight))
      })
      rowX += colWidths.description

      // Quantity column (centered vertically if multi-line description)
      const centerY = rowY + (rowHeight / 2)
      this.doc.text(voce.quantita.toString(), rowX, centerY)
      rowX += colWidths.quantity

      // Price column (centered vertically)
      this.doc.text(formatCurrency(voce.prezzoUnitario), rowX, centerY)
      rowX += colWidths.price

      // Total column (centered vertically)
      this.doc.text(formatCurrency(voce.totale), rowX, centerY)

      this.currentY += rowHeight
    })

    this.currentY += 10
  }

  private drawTotals(data: GeneratedQuoteData): void {
    this.addNewPageIfNeeded(40)

    const totalsWidth = 80
    const totalsX = this.pageWidth - this.margin - totalsWidth

    // Subtotal
    this.doc.text('Subtotale:', totalsX, this.currentY)
    this.doc.text(formatCurrency(data.totali.subtotale), totalsX + 60, this.currentY, { align: 'right' })
    this.currentY += 6

    // Discount if present
    if (data.totali.sconto) {
      this.doc.setTextColor(220, 38, 38) // Red
      this.doc.text(`Sconto (${data.totali.percentualeSconto}%):`, totalsX, this.currentY)
      this.doc.text(`-${formatCurrency(data.totali.sconto)}`, totalsX + 60, this.currentY, { align: 'right' })
      this.doc.setTextColor(0, 0, 0)
      this.currentY += 6
    }

    // VAT
    this.doc.text(`IVA (${data.totali.percentualeIva}%):`, totalsX, this.currentY)
    this.doc.text(formatCurrency(data.totali.iva), totalsX + 60, this.currentY, { align: 'right' })
    this.currentY += 6

    // Total (highlighted)
    this.doc.setFillColor(212, 70, 239) // Pink
    this.doc.rect(totalsX - 5, this.currentY - 3, totalsWidth + 10, 8, 'F')
    
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255) // White
    this.doc.text('TOTALE:', totalsX, this.currentY + 2)
    this.doc.text(formatCurrency(data.totali.totale), totalsX + 60, this.currentY + 2, { align: 'right' })
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(0, 0, 0)
    this.currentY += 15
  }

  private drawAnnualManagement(data: GeneratedQuoteData): void {
    if (!data.gestioneAnnuale) return

    this.addNewPageIfNeeded(40)

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('GESTIONE ANNUALE', this.margin, this.currentY)
    this.currentY += 10

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')

    data.gestioneAnnuale.items.forEach(item => {
      this.doc.text(`${item.description}:`, this.margin, this.currentY)
      this.doc.text(`€${item.monthly}/mese`, this.pageWidth - this.margin - 30, this.currentY, { align: 'right' })
      this.currentY += 6
    })

    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Totale Annuale:', this.margin, this.currentY)
    this.doc.text(formatCurrency(data.gestioneAnnuale.totalAnnual), this.pageWidth - this.margin - 30, this.currentY, { align: 'right' })
    this.currentY += 15
  }

  private drawConditions(data: GeneratedQuoteData): void {
    // Calculate required space for all conditions
    const conditions = [
      { label: 'Metodo di Pagamento', value: data.condizioni.paymentTerms },
      { label: 'Variazione Costi', value: `Fino a +${data.condizioni.costVariation}%` },
      { label: 'Penale Cancellazione', value: `${data.condizioni.cancellationPenalty}% del totale` },
      { label: 'Validità', value: `${data.condizioni.validityDays} giorni dalla data di emissione` }
    ]

    // Calculate total required space
    let totalHeight = 20 // Title + margins
    conditions.forEach(condition => {
      if (condition.value) {
        const lines = this.doc.splitTextToSize(condition.value, this.pageWidth - this.margin - 50)
        totalHeight += Math.max(6, lines.length * 5)
      }
    })

    this.addNewPageIfNeeded(totalHeight)

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('CONDIZIONI', this.margin, this.currentY)
    this.currentY += 10

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')

    conditions.forEach(condition => {
      if (condition.value) {
        const lines = this.doc.splitTextToSize(condition.value, this.pageWidth - this.margin - 50)
        const requiredSpace = Math.max(6, lines.length * 5)
        
        // Check if this condition fits on current page
        this.addNewPageIfNeeded(requiredSpace)
        
        this.doc.setFont('helvetica', 'bold')
        this.doc.text(`${condition.label}:`, this.margin, this.currentY)
        this.doc.setFont('helvetica', 'normal')
        
        // Render all lines
        lines.forEach((line: string, lineIndex: number) => {
          this.doc.text(line, this.margin + 50, this.currentY + (lineIndex * 5))
        })
        
        this.currentY += requiredSpace
      }
    })

    this.currentY += 10
  }

  private drawLegalSections(data: GeneratedQuoteData): void {
    if (!data.sezioniStandard) return

    this.addNewPageIfNeeded(80)

    this.doc.setFontSize(9)
    this.doc.setTextColor(55, 65, 81) // Dark gray

    const sections = [
      { title: 'UTILIZZO MATERIALI', content: data.sezioniStandard.utilizzoMateriali },
      { title: 'VARIAZIONE COSTI', content: data.sezioniStandard.variazioneCosti },
      { title: 'ACCETTAZIONE', content: data.sezioniStandard.oggettoContratto }
    ]

    sections.forEach(section => {
      if (section.content) {
        this.addNewPageIfNeeded(20)
        
        this.doc.setFont('helvetica', 'bold')
        this.doc.text(section.title, this.margin, this.currentY)
        this.currentY += 6

        this.doc.setFont('helvetica', 'normal')
        const lines = this.doc.splitTextToSize(section.content, this.pageWidth - 2 * this.margin)
        this.doc.text(lines, this.margin, this.currentY)
        this.currentY += lines.length * 4 + 8
      }
    })
  }

  private drawTemplateObjectives(data: GeneratedQuoteData): void {
    if (!data.obiettivi || data.obiettivi.length === 0) return
    
    this.addNewPageIfNeeded(30)
    
    // Section title
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(212, 70, 239) // Pink
    this.doc.text('OBIETTIVI DEL PROGETTO', this.margin, this.currentY)
    
    this.currentY += 10
    
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(55, 65, 81)
    
    data.obiettivi.forEach((obiettivo) => {
      this.addNewPageIfNeeded(10)
      // Bullet point (pink circle)
      this.doc.setFillColor(212, 70, 239)
      this.doc.circle(this.margin + 2, this.currentY - 1, 1, 'F')
      
      // Objective text
      const lines = this.doc.splitTextToSize(obiettivo, this.pageWidth - this.margin - 10)
      lines.forEach((line: string, lineIndex: number) => {
        this.doc.text(line, this.margin + 6, this.currentY + (lineIndex * 5))
      })
      this.currentY += Math.max(6, lines.length * 5)
    })
    
    this.currentY += 5
  }

  private drawTemplateActivities(data: GeneratedQuoteData): void {
    if (!data.attivita || data.attivita.length === 0) return
    
    this.addNewPageIfNeeded(30)
    
    // Section title
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(147, 51, 234) // Purple
    this.doc.text('ATTIVITÀ PRINCIPALI', this.margin, this.currentY)
    
    this.currentY += 10
    
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(55, 65, 81)
    
    data.attivita.forEach((attivita) => {
      this.addNewPageIfNeeded(10)
      // Bullet point (purple circle)
      this.doc.setFillColor(147, 51, 234)
      this.doc.circle(this.margin + 2, this.currentY - 1, 1, 'F')
      
      // Activity text
      const lines = this.doc.splitTextToSize(attivita, this.pageWidth - this.margin - 10)
      lines.forEach((line: string, lineIndex: number) => {
        this.doc.text(line, this.margin + 6, this.currentY + (lineIndex * 5))
      })
      this.currentY += Math.max(6, lines.length * 5)
    })
    
    this.currentY += 5
  }

  private drawFooter(pageNumber: number, totalPages: number): void {
    const footerHeight = 25
    const footerY = this.pageHeight - footerHeight
    
    // Top border (thin gray)
    this.doc.setDrawColor(229, 231, 235) // Light gray border
    this.doc.setLineWidth(0.3)
    this.doc.line(0, footerY, this.pageWidth, footerY)
    
    // Background (light gray)
    this.doc.setFillColor(249, 250, 251) // #F9FAFB
    this.doc.rect(0, footerY, this.pageWidth, footerHeight, 'F')
    
    // Footer text styling
    this.doc.setFontSize(8)
    this.doc.setTextColor(55, 65, 81) // Dark gray
    
    // Line 1: Company name (bold)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('RIGHELLO S.R.L.', this.pageWidth / 2, footerY + 6, { align: 'center' })
    
    // Line 2: P.IVA and address
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('P.IVA/CF: 01979790934 | Via Villaraccolta 23, 33080 Pasiano di Pordenone (PN)', this.pageWidth / 2, footerY + 11, { align: 'center' })
    
    // Line 3: PEC and capital
    this.doc.text('PEC: www.apgbora.waste@righello.co | Capitale Sociale: €10.000,00 i.v.', this.pageWidth / 2, footerY + 16, { align: 'center' })
    
    // Page number (bottom right)
    this.doc.setFontSize(7)
    this.doc.setTextColor(107, 114, 128) // Lighter gray for page number
    this.doc.text(`Pagina ${pageNumber} di ${totalPages}`, this.pageWidth - this.margin, footerY + 21, { align: 'right' })
  }

  public generatePDF(data: GeneratedQuoteData): jsPDF {
    this.drawHeader(data)
    
    // Project Type Badge (if provided)
    if (data.projectType) {
      this.drawProjectTypeHeader(data.projectType)
    }
    
    this.drawTitle(data)
    this.drawClientInfo(data)
    this.drawProjectDescription(data)
    
    // Template-specific objectives and activities
    this.drawTemplateObjectives(data)
    this.drawTemplateActivities(data)
    
    this.drawItemsTable(data)
    this.drawTotals(data)
    this.drawAnnualManagement(data)
    this.drawConditions(data)
    this.drawLegalSections(data)
    
    // Add footer to all pages
    const totalPages = this.doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i)
      this.drawFooter(i, totalPages)
    }

    return this.doc
  }
}

// Main export functions
export const generateQuotePDF = (data: GeneratedQuoteData): jsPDF => {
  const generator = new RighelloPDFGenerator()
  return generator.generatePDF(data)
}

export const downloadQuotePDF = (data: GeneratedQuoteData, filename?: string): void => {
  const pdf = generateQuotePDF(data)
  const defaultFilename = `Preventivo_${data.preventivo.numeroPreventivo}_${data.cliente.nome.replace(/\s+/g, '_')}.pdf`
  pdf.save(filename || defaultFilename)
}

export const getQuotePDFBlob = (data: GeneratedQuoteData): Blob => {
  const pdf = generateQuotePDF(data)
  return pdf.output('blob')
}

export const getQuotePDFDataURL = (data: GeneratedQuoteData): string => {
  const pdf = generateQuotePDF(data)
  return pdf.output('datauristring')
}