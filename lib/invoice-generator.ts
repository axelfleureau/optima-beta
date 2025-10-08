// Invoice PDF Generation Service for Payment Receipts
import jsPDF from 'jspdf'
import type { Quote } from '@/lib/ai-quote-service'

// Righello Brand Colors - Corporate Palette
const COLORS = {
  primary: '#D946EF', // Pink Righello
  dark: '#1F2937',
  light: '#F9FAFB',
  border: '#E5E7EB',
  text: '#374151',
}

// Payment details for invoice generation
export interface InvoicePaymentData {
  paymentIntentId: string
  paymentType: 'deposit' | 'milestone' | 'full'
  amount: number // In euros (not cents)
  currency: string
  status: string
  paidAt: Date
  milestoneId?: string
  milestoneName?: string
  depositPercentage?: string
}

export class RighelloInvoiceGenerator {
  private doc: jsPDF
  private currentY: number = 20
  private margin: number = 20
  private pageWidth: number
  private pageHeight: number
  
  constructor() {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    this.pageWidth = this.doc.internal.pageSize.width
    this.pageHeight = this.doc.internal.pageSize.height
  }

  private addNewPageIfNeeded(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.doc.addPage()
      this.currentY = this.margin
    }
  }
  
  private drawInvoiceHeader(invoiceNumber: string, invoiceDate: Date): void {
    // Pink header background
    this.doc.setFillColor(212, 70, 239)
    this.doc.rect(0, 0, this.pageWidth, 40, 'F')
    
    // Logo + Brand
    this.doc.setFontSize(28)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('RIGHELLO', this.margin, 20)
    
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('We Are Digital', this.margin, 28)
    
    // Invoice info (right aligned)
    const rightMargin = this.pageWidth - this.margin
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('FATTURA', rightMargin, 20, { align: 'right' })
    
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(invoiceNumber, rightMargin, 28, { align: 'right' })
    this.doc.text(invoiceDate.toLocaleDateString('it-IT'), rightMargin, 34, { align: 'right' })
    
    this.currentY = 50
  }
  
  private drawClientInfo(clientName: string, clientEmail: string): void {
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(55, 65, 81)
    this.doc.text('INTESTATO A:', this.margin, this.currentY)
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(clientName, this.margin, this.currentY + 6)
    if (clientEmail) {
      this.doc.text(clientEmail, this.margin, this.currentY + 12)
    }
    
    this.currentY += 25
  }
  
  private drawPaymentDetails(payment: InvoicePaymentData, quote: Quote): void {
    this.addNewPageIfNeeded(50)
    
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(212, 70, 239)
    this.doc.text('DETTAGLI PAGAMENTO', this.margin, this.currentY)
    
    this.currentY += 8
    
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(55, 65, 81)
    
    // Determine payment type label
    let paymentTypeLabel = 'Pagamento Completo'
    if (payment.paymentType === 'deposit') {
      paymentTypeLabel = `Deposito${payment.depositPercentage ? ` (${payment.depositPercentage}%)` : ''}`
    } else if (payment.paymentType === 'milestone') {
      paymentTypeLabel = `Milestone${payment.milestoneName ? `: ${payment.milestoneName}` : ''}`
    }
    
    const details = [
      { label: 'Preventivo:', value: quote.title },
      { label: 'ID Preventivo:', value: quote.id },
      { label: 'Tipo Pagamento:', value: paymentTypeLabel },
      { label: 'Importo:', value: `€${payment.amount.toFixed(2)}` },
      { label: 'Stato:', value: payment.status === 'succeeded' ? 'Completato' : payment.status },
      { label: 'Data Pagamento:', value: payment.paidAt.toLocaleDateString('it-IT') },
      { label: 'ID Transazione:', value: payment.paymentIntentId.substring(0, 20) + '...' },
    ]
    
    details.forEach(({ label, value }) => {
      this.doc.text(label, this.margin + 2, this.currentY)
      this.doc.text(value, this.margin + 60, this.currentY)
      this.currentY += 6
    })
    
    this.currentY += 10
  }
  
  private drawTotal(amount: number, currency: string): void {
    this.addNewPageIfNeeded(20)
    
    // Total box
    this.doc.setFillColor(249, 250, 251)
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 15, 'F')
    
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(212, 70, 239)
    this.doc.text('TOTALE FATTURA:', this.margin + 2, this.currentY + 10)
    
    const currencySymbol = currency.toUpperCase() === 'EUR' ? '€' : currency
    this.doc.text(`${currencySymbol}${amount.toFixed(2)}`, this.pageWidth - this.margin - 2, this.currentY + 10, { align: 'right' })
    
    this.currentY += 20
  }
  
  private drawFooter(): void {
    const footerY = this.pageHeight - 15
    
    this.doc.setDrawColor(212, 70, 239)
    this.doc.setLineWidth(1)
    this.doc.line(this.margin, footerY - 5, this.pageWidth - this.margin, footerY - 5)
    
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(107, 114, 128)
    
    const footerText = 'Righello Digital S.r.l. | Via Example 123, 00100 Roma | P.IVA 12345678901'
    this.doc.text(footerText, this.pageWidth / 2, footerY, { align: 'center' })
  }
  
  public generateInvoice(
    invoiceNumber: string,
    payment: InvoicePaymentData,
    quote: Quote,
    clientName: string,
    clientEmail: string
  ): jsPDF {
    this.drawInvoiceHeader(invoiceNumber, new Date())
    this.drawClientInfo(clientName, clientEmail)
    this.drawPaymentDetails(payment, quote)
    this.drawTotal(payment.amount, payment.currency)
    this.drawFooter()
    
    return this.doc
  }
}

export function generateInvoicePDF(
  invoiceNumber: string,
  payment: InvoicePaymentData,
  quote: Quote,
  clientName: string,
  clientEmail: string
): jsPDF {
  const generator = new RighelloInvoiceGenerator()
  return generator.generateInvoice(invoiceNumber, payment, quote, clientName, clientEmail)
}

export function getInvoicePDFBlob(
  invoiceNumber: string,
  payment: InvoicePaymentData,
  quote: Quote,
  clientName: string,
  clientEmail: string
): Blob {
  const pdf = generateInvoicePDF(invoiceNumber, payment, quote, clientName, clientEmail)
  return pdf.output('blob')
}
