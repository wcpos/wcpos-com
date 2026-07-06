import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import type {
  AccountOrderReceiptFact,
  AccountOrderReceiptProfileFact,
} from './account-order-projection'
import { formatOrderAmount } from './order-display'
import { formatDateForLocale } from './date-format'

function normalize(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }

  return ''
}

function buildAddressLine(profile: AccountOrderReceiptProfileFact): string {
  const city = normalize(profile.city)
  const region = normalize(profile.region)
  const postalCode = normalize(profile.postalCode)
  return [city, region, postalCode].filter(Boolean).join(', ')
}

function drawLabelValueRow(params: {
  page: import('pdf-lib').PDFPage
  label: unknown
  value: unknown
  x: number
  y: number
  labelFont: import('pdf-lib').PDFFont
  valueFont: import('pdf-lib').PDFFont
  size?: number
}) {
  const { page, label, value, x, y, labelFont, valueFont, size = 10 } = params
  const safeLabel = sanitizeTextForFont(labelFont, label)
  const safeValue = sanitizeTextForFont(valueFont, value)

  page.drawText(safeLabel, {
    x,
    y,
    font: labelFont,
    size,
    color: rgb(0.33, 0.33, 0.33),
  })
  page.drawText(safeValue, {
    x: x + 90,
    y,
    font: valueFont,
    size,
    color: rgb(0.1, 0.1, 0.1),
  })
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

export async function buildTaxReceiptPdf(
  receipt: AccountOrderReceiptFact,
  locale: string = 'en-US'
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595.28, 841.89]) // A4
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const margin = 48
  const width = page.getWidth()

  page.drawRectangle({
    x: 0,
    y: page.getHeight() - 110,
    width,
    height: 110,
    color: rgb(0.1, 0.2, 0.5),
  })

  page.drawText('WCPOS', {
    x: margin,
    y: page.getHeight() - 56,
    font: fontBold,
    size: 22,
    color: rgb(1, 1, 1),
  })
  page.drawText('Tax Receipt', {
    x: margin,
    y: page.getHeight() - 82,
    font: fontRegular,
    size: 13,
    color: rgb(0.9, 0.94, 1),
  })

  page.drawText(`Order #${receipt.displayId}`, {
    x: width - 200,
    y: page.getHeight() - 60,
    font: fontBold,
    size: 13,
    color: rgb(1, 1, 1),
  })
  if (receipt.legacyDisplayId) {
    page.drawText(`WooCommerce order #${receipt.legacyDisplayId}`, {
      x: width - 200,
      y: page.getHeight() - 78,
      font: fontRegular,
      size: 10,
      color: rgb(0.9, 0.94, 1),
    })
  }

  const infoTopY = page.getHeight() - 145
  drawLabelValueRow({
    page,
    label: 'Order date',
    value: formatDateForLocale(receipt.createdAt, locale),
    x: margin,
    y: infoTopY,
    labelFont: fontRegular,
    valueFont: fontBold,
  })
  drawLabelValueRow({
    page,
    label: 'Customer',
    value: normalize(receipt.customerEmail) || 'No email provided',
    x: margin,
    y: infoTopY - 16,
    labelFont: fontRegular,
    valueFont: fontRegular,
  })

  const billingTopY = infoTopY - 56
  page.drawText('Billing details', {
    x: margin,
    y: billingTopY,
    font: fontBold,
    size: 12,
    color: rgb(0.1, 0.1, 0.1),
  })

  const billingLines: string[] = []
  const addressLine1 = normalize(receipt.billingProfile.addressLine1)
  const addressLine2 = normalize(receipt.billingProfile.addressLine2)
  const locationLine = buildAddressLine(receipt.billingProfile)
  const countryCode = normalize(receipt.billingProfile.countryCode)
  const taxNumber = normalize(receipt.billingProfile.taxNumber)

  if (addressLine1) billingLines.push(addressLine1)
  if (addressLine2) billingLines.push(addressLine2)
  if (locationLine) billingLines.push(locationLine)
  if (countryCode) billingLines.push(countryCode)
  if (taxNumber) billingLines.push(`Tax number: ${taxNumber}`)
  if (billingLines.length === 0) {
    billingLines.push('No billing details on file')
  }

  billingLines.forEach((line, index) => {
    page.drawText(sanitizeTextForFont(fontRegular, line), {
      x: margin,
      y: billingTopY - 18 - index * 14,
      font: fontRegular,
      size: 10,
      color: rgb(0.18, 0.18, 0.18),
    })
  })

  const tableTopY = billingTopY - 120
  page.drawRectangle({
    x: margin,
    y: tableTopY,
    width: width - margin * 2,
    height: 24,
    color: rgb(0.94, 0.95, 0.97),
  })

  const qtyX = width - margin - 200
  const unitX = width - margin - 140
  const totalX = width - margin - 70

  page.drawText('Item', {
    x: margin + 8,
    y: tableTopY + 8,
    font: fontBold,
    size: 10,
  })
  page.drawText('Qty', {
    x: qtyX,
    y: tableTopY + 8,
    font: fontBold,
    size: 10,
  })
  page.drawText('Unit', {
    x: unitX,
    y: tableTopY + 8,
    font: fontBold,
    size: 10,
  })
  page.drawText('Total', {
    x: totalX,
    y: tableTopY + 8,
    font: fontBold,
    size: 10,
  })

  let rowY = tableTopY - 18
  for (const item of receipt.items ?? []) {
    const itemTitle =
      typeof item?.title === 'string' && item.title.trim()
        ? item.title
        : 'Untitled item'

    page.drawText(sanitizeTextForFont(fontRegular, itemTitle), {
      x: margin + 8,
      y: rowY,
      font: fontRegular,
      size: 10,
      maxWidth: qtyX - margin - 16,
    })
    page.drawText(sanitizeTextForFont(fontRegular, String(item.quantity)), {
      x: qtyX,
      y: rowY,
      font: fontRegular,
      size: 10,
    })
    page.drawText(
      sanitizeTextForFont(
        fontRegular,
        formatAmount(item.unitPrice, receipt.currencyCode)
      ),
      {
      x: unitX,
      y: rowY,
      font: fontRegular,
      size: 10,
      }
    )
    page.drawText(
      sanitizeTextForFont(
        fontRegular,
        formatAmount(item.total, receipt.currencyCode)
      ),
      {
      x: totalX,
      y: rowY,
      font: fontRegular,
      size: 10,
      }
    )
    rowY -= 16
  }

  rowY -= 8
  page.drawLine({
    start: { x: width - margin - 180, y: rowY },
    end: { x: width - margin, y: rowY },
    thickness: 1,
    color: rgb(0.82, 0.82, 0.84),
  })
  rowY -= 16

  drawLabelValueRow({
    page,
    label: 'Subtotal',
    value: formatAmount(receipt.totals.subtotal, receipt.currencyCode),
    x: width - margin - 180,
    y: rowY,
    labelFont: fontRegular,
    valueFont: fontRegular,
  })
  rowY -= 14
  drawLabelValueRow({
    page,
    label: 'Tax',
    value: formatAmount(receipt.totals.tax, receipt.currencyCode),
    x: width - margin - 180,
    y: rowY,
    labelFont: fontRegular,
    valueFont: fontRegular,
  })
  rowY -= 16
  drawLabelValueRow({
    page,
    label: 'Total',
    value: formatAmount(receipt.totals.total, receipt.currencyCode),
    x: width - margin - 180,
    y: rowY,
    labelFont: fontBold,
    valueFont: fontBold,
    size: 11,
  })

  page.drawText('Thank you for your WCPOS Pro purchase.', {
    x: margin,
    y: 72,
    font: fontRegular,
    size: 10,
    color: rgb(0.35, 0.35, 0.35),
  })

  return pdf.save({
    useObjectStreams: false,
  })
}
