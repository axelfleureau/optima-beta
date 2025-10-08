// PDF Generation Service using jsPDF for better compatibility
import jsPDF from 'jspdf'
import type { GeneratedQuoteData } from '@/lib/ai-quote-service'

// Righello Brand Colors
const COLORS = {
  primary: '#D946EF', // Pink
  secondary: '#1F2937', // Dark gray
  accent: '#F3F4F6', // Light gray
  text: '#374151',
  border: '#E5E7EB',
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
    // Logo and company name
    this.doc.setFontSize(24)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(212, 70, 239) // Pink color
    this.doc.text('RIGHELLO', this.margin, this.currentY)
    
    this.doc.setFontSize(10)
    this.doc.setTextColor(55, 65, 81) // Dark gray
    this.doc.text('Marketing Intelligence', this.margin, this.currentY + 8)

    // Quote info (right aligned)
    const rightMargin = this.pageWidth - this.margin
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(0, 0, 0)
    this.doc.text('PREVENTIVO', rightMargin, this.currentY, { align: 'right' })
    
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(data.preventivo.numeroPreventivo, rightMargin, this.currentY + 6, { align: 'right' })
    this.doc.text(`Data: ${formatDate(data.preventivo.dataCreazione)}`, rightMargin, this.currentY + 12, { align: 'right' })

    // Divider line
    this.currentY += 25
    this.doc.setDrawColor(212, 70, 239) // Pink
    this.doc.setLineWidth(2)
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
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

    // Header background
    this.doc.setFillColor(212, 70, 239) // Pink
    this.doc.rect(this.margin, this.currentY, tableWidth, 8, 'F')

    // Header text
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255) // White
    
    let headerX = this.margin + 2
    this.doc.text('Codice', headerX, this.currentY + 5)
    headerX += colWidths.code
    this.doc.text('Descrizione', headerX, this.currentY + 5)
    headerX += colWidths.description
    this.doc.text('Qtà', headerX, this.currentY + 5)
    headerX += colWidths.quantity
    this.doc.text('Prezzo Unit.', headerX, this.currentY + 5)
    headerX += colWidths.price
    this.doc.text('Totale', headerX, this.currentY + 5)

    this.currentY += 8

    // Table rows
    this.doc.setTextColor(0, 0, 0)
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
      if (index % 2 === 1) {
        this.doc.setFillColor(243, 244, 246) // Light gray
        this.doc.rect(this.margin, this.currentY, tableWidth, rowHeight, 'F')
      }

      let rowX = this.margin + 2
      const rowY = this.currentY + 4

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

  private drawFooter(): void {
    const footerY = this.pageHeight - 15
    
    this.doc.setFontSize(8)
    this.doc.setTextColor(55, 65, 81)
    this.doc.setFont('helvetica', 'normal')
    
    const footerText1 = 'Righello S.r.l. | Via Example 123, 00100 Roma | Tel: +39 06 123456 | Email: info@righello.com'
    const footerText2 = 'P.IVA: 12345678901 | www.righello.com'
    
    this.doc.text(footerText1, this.pageWidth / 2, footerY - 5, { align: 'center' })
    this.doc.text(footerText2, this.pageWidth / 2, footerY, { align: 'center' })

    // Line above footer
    this.doc.setDrawColor(229, 231, 235)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, footerY - 10, this.pageWidth - this.margin, footerY - 10)
  }

  public generatePDF(data: GeneratedQuoteData): jsPDF {
    this.drawHeader(data)
    this.drawTitle(data)
    this.drawClientInfo(data)
    this.drawProjectDescription(data)
    this.drawItemsTable(data)
    this.drawTotals(data)
    this.drawAnnualManagement(data)
    this.drawConditions(data)
    this.drawLegalSections(data)
    this.drawFooter()

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