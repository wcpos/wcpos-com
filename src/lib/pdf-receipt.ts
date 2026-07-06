import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type {
  AccountOrderReceiptFact,
  AccountOrderReceiptProfileFact,
} from './account-order-projection'
import { formatOrderAmount } from './order-display'
import { formatDateForLocale } from './date-format'

// Seller identity printed in the receipt footer.
const SELLER_NAME = 'WCPOS'
const SELLER_WEBSITE = 'wcpos.com'
const SELLER_EMAIL = 'support@wcpos.com'
// The ABN footer line is omitted while empty.
const SELLER_ABN = '86 792 035 060'

/**
 * Order receipt PDF.
 *
 * Deliberately monochrome and typographic — receipts get printed in black
 * and white, so there are no filled colour blocks, only text weight,
 * greyscale and hairline rules. The document is titled "Receipt", NOT
 * "Tax Invoice": the seller is not registered for GST in Australia, and
 * only GST-registered businesses may issue tax invoices. The footer states
 * this so the receipt still works as proof of purchase for tax records.
 */

// Greyscale palette — prints faithfully in B&W.
const INK = rgb(0.12, 0.13, 0.15)
const MUTED = rgb(0.42, 0.44, 0.47)
const FAINT = rgb(0.62, 0.64, 0.67)
const LINE = rgb(0.8, 0.82, 0.84)

const PAGE_WIDTH = 595.28 // A4
const PAGE_HEIGHT = 841.89
const MARGIN = 56

function normalize(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }

  return ''
}

function sanitizeTextForFont(font: PDFFont, value: unknown): string {
  const normalizedValue = normalize(value)
  if (!normalizedValue) return ''

  let safeText = ''

  for (const char of normalizedValue.normalize('NFKD')) {
    try {
      font.encodeText(char)
      safeText += char
    } catch {
      safeText += '?'
    }
  }

  return safeText.replace(/\?{2,}/g, '?')
}

function formatAmount(amount: unknown, currencyCode: unknown): string {
  const numericAmount =
    typeof amount === 'number'
      ? amount
      : typeof amount === 'string'
        ? Number.parseFloat(amount)
        : Number.NaN

  if (!Number.isFinite(numericAmount)) {
    return '--'
  }

  const normalizedCurrency = normalize(currencyCode).toUpperCase()

  if (/^[A-Z]{3}$/.test(normalizedCurrency)) {
    try {
      return formatOrderAmount(numericAmount, normalizedCurrency)
    } catch {
      // fall back below
    }
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount)
}

/** Human label for Medusa payment_status values. */
function paymentLabel(status: unknown): string | null {
  const normalized = normalize(status).toLowerCase()
  if (!normalized) return null

  switch (normalized) {
    case 'captured':
    case 'paid':
      return 'Paid'
    case 'refunded':
      return 'Refunded'
    case 'partially_refunded':
      return 'Partially refunded'
    case 'canceled':
      return 'Canceled'
    default:
      return normalized.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  }
}

function buildAddressLine(profile: AccountOrderReceiptProfileFact): string {
  const city = normalize(profile.city)
  const region = normalize(profile.region)
  const postalCode = normalize(profile.postalCode)
  return [city, region, postalCode].filter(Boolean).join(', ')
}

/** Greedy word-wrap against real glyph widths. */
function wrapText(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines
}

/**
 * Single-line fit: returns text unchanged if it fits maxWidth, otherwise
 * trims words and appends an ellipsis so it can't overprint an adjacent
 * column. Used for values drawn on a shared baseline (item titles beside the
 * numeric columns, billed-to lines beside the details column).
 */
function truncateToWidth(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number
): string {
  // Measure the encodable form — widthOfTextAtSize throws on glyphs the
  // standard font can't encode (e.g. emoji), which drawText would replace.
  text = sanitizeTextForFont(font, text)
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text

  const ellipsis = '…'
  let truncated = text
  while (
    truncated &&
    font.widthOfTextAtSize(truncated + ellipsis, size) > maxWidth
  ) {
    truncated = truncated.slice(0, -1).trimEnd()
  }
  return truncated ? truncated + ellipsis : ellipsis
}

type TextStyle = {
  font: PDFFont
  size: number
  color?: ReturnType<typeof rgb>
}

function drawLeft(page: PDFPage, text: string, x: number, y: number, style: TextStyle) {
  const safe = sanitizeTextForFont(style.font, text)
  if (!safe) return
  page.drawText(safe, {
    x,
    y,
    font: style.font,
    size: style.size,
    color: style.color ?? INK,
  })
}

function drawRight(page: PDFPage, text: string, rightX: number, y: number, style: TextStyle) {
  const safe = sanitizeTextForFont(style.font, text)
  if (!safe) return
  page.drawText(safe, {
    x: rightX - style.font.widthOfTextAtSize(safe, style.size),
    y,
    font: style.font,
    size: style.size,
    color: style.color ?? INK,
  })
}

function drawRule(page: PDFPage, y: number, fromX = MARGIN, toX = PAGE_WIDTH - MARGIN) {
  page.drawLine({
    start: { x: fromX, y },
    end: { x: toX, y },
    thickness: 0.75,
    color: LINE,
  })
}

export async function buildReceiptPdf(
  receipt: AccountOrderReceiptFact,
  locale: string = 'en-US'
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const rightEdge = PAGE_WIDTH - MARGIN

  // ── Header ────────────────────────────────────────────────────────────
  let y = PAGE_HEIGHT - 78
  drawLeft(page, SELLER_NAME, MARGIN, y, { font: bold, size: 22 })
  drawLeft(page, SELLER_WEBSITE, MARGIN, y - 16, { font: regular, size: 9, color: MUTED })

  drawRight(page, 'Receipt', rightEdge, y, { font: bold, size: 22 })
  drawRight(page, `Order #${normalize(receipt.displayId) || '--'}`, rightEdge, y - 16, {
    font: regular,
    size: 10,
    color: MUTED,
  })

  y -= 42
  drawRule(page, y)

  // ── Billed to / order details columns ─────────────────────────────────
  y -= 26
  const detailX = 330
  const columnTop = y

  drawLeft(page, 'BILLED TO', MARGIN, y, { font: bold, size: 8, color: FAINT })
  y -= 16

  const billingLines: Array<{ text: string; isName?: boolean }> = []
  const customerName = normalize(receipt.customerName)
  if (customerName) billingLines.push({ text: customerName, isName: true })
  const email = normalize(receipt.customerEmail)
  billingLines.push({ text: email || 'No email provided', isName: !customerName })

  const addressLine1 = normalize(receipt.billingProfile.addressLine1)
  const addressLine2 = normalize(receipt.billingProfile.addressLine2)
  const locationLine = buildAddressLine(receipt.billingProfile)
  const countryCode = normalize(receipt.billingProfile.countryCode).toUpperCase()
  const taxNumber = normalize(receipt.billingProfile.taxNumber)

  if (addressLine1) billingLines.push({ text: addressLine1 })
  if (addressLine2) billingLines.push({ text: addressLine2 })
  if (locationLine) billingLines.push({ text: locationLine })
  if (countryCode) billingLines.push({ text: countryCode })
  if (taxNumber) billingLines.push({ text: `Tax ID: ${taxNumber}` })

  // Keep billed-to text clear of the DETAILS column that shares these rows.
  const billedToWidth = detailX - MARGIN - 16
  for (const line of billingLines) {
    const font = line.isName ? bold : regular
    drawLeft(page, truncateToWidth(font, line.text, 10, billedToWidth), MARGIN, y, {
      font,
      size: 10,
      color: line.isName ? INK : MUTED,
    })
    y -= 14
  }

  let detailY = columnTop
  drawLeft(page, 'DETAILS', detailX, detailY, { font: bold, size: 8, color: FAINT })
  detailY -= 16

  const detailRows: Array<[string, string]> = []
  detailRows.push(['Order date', formatDateForLocale(receipt.createdAt, locale)])
  const payment = paymentLabel(receipt.paymentStatus)
  if (payment) detailRows.push(['Payment', payment])
  detailRows.push(['Currency', normalize(receipt.currencyCode).toUpperCase() || '--'])

  for (const [label, value] of detailRows) {
    drawLeft(page, label, detailX, detailY, { font: regular, size: 10, color: MUTED })
    drawLeft(page, value, detailX + 80, detailY, { font: regular, size: 10 })
    detailY -= 14
  }

  y = Math.min(y, detailY) - 14

  // ── Legacy order-number notice ────────────────────────────────────────
  // Orders migrated from the old WooCommerce store carried a different
  // order number. Flag it so customers can reconcile older records.
  const legacyDisplayId = receipt.legacyDisplayId
  if (legacyDisplayId) {
    const noticeText = `This order was originally #${legacyDisplayId} in our previous store system. Older emails, invoices and records may reference that number.`
    const noticeLines = wrapText(regular, noticeText, 9, rightEdge - MARGIN - 24)
    const boxHeight = noticeLines.length * 12 + 18

    page.drawRectangle({
      x: MARGIN,
      y: y - boxHeight,
      width: rightEdge - MARGIN,
      height: boxHeight,
      borderWidth: 0.75,
      borderColor: LINE,
    })

    let noticeY = y - 15
    for (const line of noticeLines) {
      drawLeft(page, line, MARGIN + 12, noticeY, { font: regular, size: 9, color: MUTED })
      noticeY -= 12
    }

    y -= boxHeight + 24
  } else {
    y -= 10
  }

  // ── Items table ───────────────────────────────────────────────────────
  const qtyRight = 380
  const unitRight = 460
  const amountRight = rightEdge

  drawLeft(page, 'DESCRIPTION', MARGIN, y, { font: bold, size: 8, color: FAINT })
  drawRight(page, 'QTY', qtyRight, y, { font: bold, size: 8, color: FAINT })
  drawRight(page, 'UNIT PRICE', unitRight, y, { font: bold, size: 8, color: FAINT })
  drawRight(page, 'AMOUNT', amountRight, y, { font: bold, size: 8, color: FAINT })
  y -= 8
  drawRule(page, y)
  y -= 18

  for (const item of receipt.items ?? []) {
    const itemTitle =
      typeof item?.title === 'string' && item.title.trim()
        ? item.title.trim()
        : 'Untitled item'

    // Keep the title clear of the right-aligned QTY column on the same row.
    const titleWidth = qtyRight - MARGIN - 30
    drawLeft(page, truncateToWidth(regular, itemTitle, 10, titleWidth), MARGIN, y, {
      font: regular,
      size: 10,
    })
    drawRight(page, normalize(item.quantity) || '--', qtyRight, y, {
      font: regular,
      size: 10,
    })
    drawRight(page, formatAmount(item.unitPrice, receipt.currencyCode), unitRight, y, {
      font: regular,
      size: 10,
    })
    drawRight(page, formatAmount(item.total, receipt.currencyCode), amountRight, y, {
      font: regular,
      size: 10,
    })
    y -= 18
  }

  y += 4
  drawRule(page, y)

  // ── Totals ────────────────────────────────────────────────────────────
  const totalsLabelX = 380
  y -= 20

  drawLeft(page, 'Subtotal', totalsLabelX, y, { font: regular, size: 10, color: MUTED })
  drawRight(page, formatAmount(receipt.totals.subtotal, receipt.currencyCode), amountRight, y, {
    font: regular,
    size: 10,
  })
  y -= 16

  // No GST registration → tax is always zero; only render a tax row in the
  // unexpected case a nonzero amount ever appears, so it's never hidden.
  const taxAmount =
    typeof receipt.totals.tax === 'number' && Number.isFinite(receipt.totals.tax)
      ? receipt.totals.tax
      : 0
  if (taxAmount > 0) {
    drawLeft(page, 'Tax', totalsLabelX, y, { font: regular, size: 10, color: MUTED })
    drawRight(page, formatAmount(taxAmount, receipt.currencyCode), amountRight, y, {
      font: regular,
      size: 10,
    })
    y -= 16
  }

  drawRule(page, y + 4, totalsLabelX, amountRight)
  y -= 8
  drawLeft(page, 'Total', totalsLabelX, y, { font: bold, size: 12 })
  drawRight(page, formatAmount(receipt.totals.total, receipt.currencyCode), amountRight, y, {
    font: bold,
    size: 12,
  })
  // Only reassure "no tax" when no Tax row was drawn — otherwise the receipt
  // would show a Tax line and a contradicting "no tax" note directly below it.
  if (taxAmount <= 0) {
    y -= 16
    drawRight(page, 'No tax has been added to this order.', amountRight, y, {
      font: regular,
      size: 8.5,
      color: MUTED,
    })
  }

  // ── Footer ────────────────────────────────────────────────────────────
  const footerLines: Array<{ text: string; style: TextStyle }> = []
  const sellerIdentity = SELLER_ABN
    ? `${SELLER_NAME} · ABN ${SELLER_ABN}`
    : `${SELLER_NAME} · ${SELLER_WEBSITE}`
  footerLines.push({ text: sellerIdentity, style: { font: bold, size: 9 } })
  footerLines.push({
    text: `${SELLER_NAME} is not registered for GST in Australia — no GST has been charged and this document is not a tax invoice.`,
    style: { font: regular, size: 9, color: MUTED },
  })
  footerLines.push({
    text: 'This receipt may be used as proof of purchase for your tax records.',
    style: { font: regular, size: 9, color: MUTED },
  })
  footerLines.push({
    text: `Questions? ${SELLER_WEBSITE}/discord · ${SELLER_EMAIL}`,
    style: { font: regular, size: 9, color: MUTED },
  })

  let footerY = MARGIN + footerLines.length * 13
  drawRule(page, footerY + 14)
  drawRight(page, `Generated ${formatDateForLocale(new Date().toISOString(), locale)}`, rightEdge, footerY, {
    font: regular,
    size: 8,
    color: FAINT,
  })
  for (const line of footerLines) {
    drawLeft(page, line.text, MARGIN, footerY, line.style)
    footerY -= 13
  }

  return pdf.save({
    useObjectStreams: false,
  })
}
