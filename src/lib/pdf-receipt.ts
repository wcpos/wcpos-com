import { readFile } from 'node:fs/promises'
import path from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import notoSansJpUnicode from '@fontsource-variable/noto-sans-jp/unicode.json'
import notoSansKrUnicode from '@fontsource-variable/noto-sans-kr/unicode.json'
import notoSansScUnicode from '@fontsource-variable/noto-sans-sc/unicode.json'
import notoSansTcUnicode from '@fontsource-variable/noto-sans-tc/unicode.json'
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

type FontSource = {
  slug: string
  packageName: string
  unicode: Record<string, string>
}

type FontRange = {
  source: FontSource
  key: string
  start: number
  end: number
}

type FontFallback = {
  id: string
  font: PDFFont
}

type FontFallbackRequest = {
  id: string
  source: FontSource
  key: string
}

export const CJK_FONT_SOURCES: FontSource[] = [
  {
    slug: 'noto-sans-sc',
    packageName: '@fontsource-variable/noto-sans-sc',
    unicode: notoSansScUnicode,
  },
  {
    slug: 'noto-sans-tc',
    packageName: '@fontsource-variable/noto-sans-tc',
    unicode: notoSansTcUnicode,
  },
  {
    slug: 'noto-sans-jp',
    packageName: '@fontsource-variable/noto-sans-jp',
    unicode: notoSansJpUnicode,
  },
  {
    slug: 'noto-sans-kr',
    packageName: '@fontsource-variable/noto-sans-kr',
    unicode: notoSansKrUnicode,
  },
]

const fontBytes = new Map<string, Promise<Uint8Array>>()
const fontRangesBySource = new Map<string, FontRange[]>()

function parseUnicodeRange(range: string): Array<[number, number]> {
  return range
    .split(',')
    .map((part) => part.trim().match(/^U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const start = Number.parseInt(match[1], 16)
      const end = Number.parseInt(match[2] ?? match[1], 16)
      return [start, end]
    })
}

function normalizeFontKey(key: string): string {
  return key.replace(/^\[(.+)\]$/, '$1')
}

function fontRangesForSource(source: FontSource): FontRange[] {
  const cached = fontRangesBySource.get(source.packageName)
  if (cached) return cached

  const ranges = Object.entries(source.unicode).flatMap(([key, value]) =>
    parseUnicodeRange(value).map(([start, end]) => ({
      source,
      key: normalizeFontKey(key),
      start,
      end,
    }))
  )

  fontRangesBySource.set(source.packageName, ranges)
  return ranges
}

function fontSourcesForLocale(locale: string): FontSource[] {
  const normalized = locale.toLowerCase()
  const bySlug = new Map(CJK_FONT_SOURCES.map((source) => [source.slug, source]))
  const preferred = normalized.startsWith('ko')
    ? 'noto-sans-kr'
    : normalized.startsWith('ja')
      ? 'noto-sans-jp'
      : normalized.includes('tw') || normalized.includes('hant')
        ? 'noto-sans-tc'
        : normalized.startsWith('zh')
          ? 'noto-sans-sc'
          : 'noto-sans-sc'

  return [
    bySlug.get(preferred),
    ...CJK_FONT_SOURCES.filter((source) => source.slug !== preferred),
  ].filter((source): source is FontSource => Boolean(source))
}

function fallbackRequestForCodePoint(
  codePoint: number,
  sources: FontSource[]
): FontFallbackRequest | null {
  for (const source of sources) {
    const range = fontRangesForSource(source).find(
      (candidate) => codePoint >= candidate.start && codePoint <= candidate.end
    )
    if (range) {
      return {
        id: `${range.source.slug}:${range.key}`,
        source: range.source,
        key: range.key,
      }
    }
  }

  return null
}

// The woff2 files ship with the receipt route through outputFileTracingIncludes
// in next.config.ts, so any subset named in a package's unicode.json is on disk.
export function cjkFontFilePath(source: FontSource, key: string): string {
  return path.join(
    process.cwd(),
    'node_modules',
    source.packageName,
    'files',
    `${source.slug}-${normalizeFontKey(key)}-wght-normal.woff2`
  )
}

async function loadFontBytes(source: FontSource, key: string): Promise<Uint8Array> {
  const id = `${source.slug}:${key}`
  const cached = fontBytes.get(id)
  if (cached) return cached

  const pending = readFile(cjkFontFilePath(source, key))
    .then((bytes) => new Uint8Array(bytes))
  fontBytes.set(id, pending)
  return pending
}

function fontCanEncode(font: PDFFont, text: string): boolean {
  try {
    font.encodeText(text)
    return true
  } catch {
    return false
  }
}

async function embedUnicodeFallbacks(
  pdf: PDFDocument,
  text: string,
  locale: string,
  primaryFonts: PDFFont[]
): Promise<FontFallback[]> {
  const sources = fontSourcesForLocale(locale)
  const requests = new Map<string, FontFallbackRequest>()

  for (const char of text.normalize('NFC')) {
    if (primaryFonts.some((font) => fontCanEncode(font, char))) continue

    const codePoint = char.codePointAt(0)
    if (codePoint == null) continue

    const request = fallbackRequestForCodePoint(codePoint, sources)
    if (request) requests.set(request.id, request)
  }

  const fallbacks: FontFallback[] = []
  for (const request of requests.values()) {
    const bytes = await loadFontBytes(request.source, request.key)
    fallbacks.push({
      id: request.id,
      font: await pdf.embedFont(bytes, { subset: true }),
    })
  }

  return fallbacks
}

function normalize(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }

  return ''
}

function pdfLanguageTag(locale: string): string {
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? 'en'
  } catch {
    return 'en'
  }
}

function fontForChar(font: PDFFont, fallbacks: FontFallback[], char: string): PDFFont | null {
  if (fontCanEncode(font, char)) return font
  return fallbacks.find((fallback) => fontCanEncode(fallback.font, char))?.font ?? null
}

function sanitizeTextForFont(font: PDFFont, value: unknown, fallbacks: FontFallback[] = []): string {
  const normalizedValue = normalize(value)
  if (!normalizedValue) return ''

  let safeText = ''

  for (const char of normalizedValue.normalize('NFC')) {
    safeText += fontForChar(font, fallbacks, char) ? char : '?'
  }

  return safeText.replace(/\?{2,}/g, '?')
}

function widthOfText(font: PDFFont, text: string, size: number, fallbacks: FontFallback[] = []): number {
  let width = 0
  for (const char of text) {
    const drawFont = fontForChar(font, fallbacks, char) ?? font
    width += drawFont.widthOfTextAtSize(fontCanEncode(drawFont, char) ? char : '?', size)
  }
  return width
}

export interface ReceiptPdfCopy {
  title: string
  orderNumber: (id: string) => string
  billedTo: string
  details: string
  noEmailProvided: string
  taxId: (taxNumber: string) => string
  orderDate: string
  payment: string
  currency: string
  legacyNotice: (legacyDisplayId: number) => string
  description: string
  quantity: string
  unitPrice: string
  amount: string
  untitledItem: string
  subtotal: string
  tax: string
  total: string; refund: string; refundDate: string
  noTaxAdded: string
  sellerIdentity: (sellerName: string, sellerAbn: string | null) => string
  gstNotice: (sellerName: string) => string
  proofOfPurchase: string
  questions: (website: string, email: string) => string
  generated: (date: string) => string
  paymentStatus: {
    paid: string
    refunded: string
    partiallyRefunded: string
    canceled: string
    unknown: string
  }
}

function formatAmount(amount: unknown, currencyCode: unknown, locale: string): string {
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
      return formatOrderAmount(numericAmount, normalizedCurrency, locale)
    } catch {
      // fall back below
    }
  }

  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }

  try {
    return new Intl.NumberFormat(locale, options).format(numericAmount)
  } catch {
    return new Intl.NumberFormat('en-US', options).format(numericAmount)
  }
}

/** Human label for Medusa payment_status values. */
function paymentLabel(status: unknown, copy: ReceiptPdfCopy): string | null {
  const normalized = normalize(status).toLowerCase()
  if (!normalized) return null

  switch (normalized) {
    case 'captured':
    case 'paid':
      return copy.paymentStatus.paid
    case 'refunded':
      return copy.paymentStatus.refunded
    case 'partially_refunded':
      return copy.paymentStatus.partiallyRefunded
    case 'canceled':
      return copy.paymentStatus.canceled
    default:
      return copy.paymentStatus.unknown
  }
}

const POSTAL_CODE_FIRST_COUNTRIES = new Set([
  'AT',
  'BE',
  'CH',
  'CZ',
  'DE',
  'DK',
  'ES',
  'FI',
  'FR',
  'IT',
  'NL',
  'NO',
  'PL',
  'PT',
  'SE',
])

const POSTAL_REGION_CITY_COUNTRIES = new Set([
  'CN',
  'HK',
  'JP',
  'KR',
  'MO',
  'TW',
])

function displayCountryName(countryCode: unknown, locale: string): string {
  const code = normalize(countryCode).toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return code

  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

function localityLine(profile: AccountOrderReceiptProfileFact): string {
  const countryCode = normalize(profile.countryCode).toUpperCase()
  const city = normalize(profile.city)
  const region = normalize(profile.region)
  const postalCode = normalize(profile.postalCode)
  const distinctRegion = region && region !== city ? region : ''

  if (POSTAL_REGION_CITY_COUNTRIES.has(countryCode)) {
    return [postalCode, distinctRegion || region, city].filter(Boolean).join(' ')
  }

  if (POSTAL_CODE_FIRST_COUNTRIES.has(countryCode)) {
    const postalCity = [postalCode, city].filter(Boolean).join(' ')
    return [postalCity, distinctRegion].filter(Boolean).join(', ')
  }

  const regionPostal = [distinctRegion || region, postalCode]
    .filter(Boolean)
    .join(' ')
  return [city, regionPostal].filter(Boolean).join(', ')
}

function billingAddressLines(
  profile: AccountOrderReceiptProfileFact,
  locale: string
): string[] {
  const lines = [
    normalize(profile.addressLine1),
    normalize(profile.addressLine2),
    localityLine(profile),
    displayCountryName(profile.countryCode, locale),
  ]
  return lines.filter(Boolean)
}

/** Greedy word-wrap against real glyph widths. */
function wrapText(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number,
  fallbacks: FontFallback[] = []
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (widthOfText(font, candidate, size, fallbacks) <= maxWidth || !current) {
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
  maxWidth: number,
  fallbacks: FontFallback[] = []
): string {
  // Measure the encodable form — widthOfTextAtSize throws on glyphs the
  // standard font can't encode (e.g. emoji), which drawText would replace.
  text = sanitizeTextForFont(font, text, fallbacks)
  if (widthOfText(font, text, size, fallbacks) <= maxWidth) return text

  const ellipsis = '…'
  let truncated = text
  while (
    truncated &&
    widthOfText(font, truncated + ellipsis, size, fallbacks) > maxWidth
  ) {
    truncated = truncated.slice(0, -1).trimEnd()
  }
  return truncated ? truncated + ellipsis : ellipsis
}

type TextStyle = {
  font: PDFFont
  size: number
  color?: ReturnType<typeof rgb>
  fallbacks?: FontFallback[]
}

function drawTextRuns(page: PDFPage, text: string, x: number, y: number, style: TextStyle) {
  const safe = sanitizeTextForFont(style.font, text, style.fallbacks)
  if (!safe) return

  let runFont: PDFFont | null = null
  let runText = ''
  let runX = x

  const flush = () => {
    if (!runText || !runFont) return
    page.drawText(runText, {
      x: runX,
      y,
      font: runFont,
      size: style.size,
      color: style.color ?? INK,
    })
    runX += runFont.widthOfTextAtSize(runText, style.size)
    runText = ''
  }

  for (const char of safe) {
    const nextFont = fontForChar(style.font, style.fallbacks ?? [], char) ?? style.font
    if (runFont && nextFont !== runFont) flush()
    runFont = nextFont
    runText += fontCanEncode(nextFont, char) ? char : '?'
  }

  flush()
}

function drawLeft(page: PDFPage, text: string, x: number, y: number, style: TextStyle) {
  drawTextRuns(page, text, x, y, style)
}

function drawRight(page: PDFPage, text: string, rightX: number, y: number, style: TextStyle) {
  const safe = sanitizeTextForFont(style.font, text, style.fallbacks)
  if (!safe) return
  drawTextRuns(page, safe, rightX - widthOfText(style.font, safe, style.size, style.fallbacks), y, style)
}

function drawRule(page: PDFPage, y: number, fromX = MARGIN, toX = PAGE_WIDTH - MARGIN) {
  page.drawLine({
    start: { x: fromX, y },
    end: { x: toX, y },
    thickness: 0.75,
    color: LINE,
  })
}


function collectReceiptText(
  receipt: AccountOrderReceiptFact,
  copy: ReceiptPdfCopy,
  locale: string
): string {
  const values: string[] = [
    SELLER_NAME,
    SELLER_WEBSITE,
    SELLER_EMAIL,
    copy.title,
    copy.orderNumber(normalize(receipt.displayId) || '--'),
    copy.billedTo,
    copy.details,
    copy.noEmailProvided,
    copy.orderDate,
    copy.payment,
    copy.currency,
    copy.description,
    copy.quantity,
    copy.unitPrice,
    copy.amount,
    copy.untitledItem,
    copy.subtotal,
    copy.tax,
    copy.total,
    copy.refund,
    copy.refundDate,
    copy.noTaxAdded,
    copy.sellerIdentity(SELLER_NAME, SELLER_ABN || null),
    copy.gstNotice(SELLER_NAME),
    copy.proofOfPurchase,
    copy.questions(`${SELLER_WEBSITE}/discord`, SELLER_EMAIL),
    copy.generated(formatDateForLocale(new Date().toISOString(), locale)),
    copy.paymentStatus.paid,
    copy.paymentStatus.refunded,
    copy.paymentStatus.partiallyRefunded,
    copy.paymentStatus.canceled,
    formatDateForLocale(receipt.createdAt, locale),
    normalize(receipt.displayId) || '--',
    normalize(receipt.billingProfile.company),
    normalize(receipt.customerName),
    normalize(receipt.customerEmail),
    ...billingAddressLines(receipt.billingProfile, locale),
    normalize(receipt.currencyCode).toUpperCase() || '--',
  ]

  const taxNumber = normalize(receipt.billingProfile.taxNumber)
  if (taxNumber) values.push(copy.taxId(taxNumber))
  if (receipt.legacyDisplayId) values.push(copy.legacyNotice(receipt.legacyDisplayId))

  const payment = paymentLabel(receipt.paymentStatus, copy)
  if (payment) values.push(payment)

  for (const item of receipt.items ?? []) {
    values.push(
      normalize(item?.title) || copy.untitledItem,
      normalize(item?.quantity) || '--',
      formatAmount(item?.unitPrice, receipt.currencyCode, locale),
      formatAmount(item?.total, receipt.currencyCode, locale)
    )
  }

  values.push(
    formatAmount(receipt.totals.subtotal, receipt.currencyCode, locale),
    formatAmount(receipt.totals.tax, receipt.currencyCode, locale),
    formatAmount(receipt.totals.total, receipt.currencyCode, locale)
  )

  for (const refund of receipt.refunds) {
    values.push(
      formatAmount(-Math.abs(refund.amount), receipt.currencyCode, locale),
      formatDateForLocale(refund.createdAt, locale)
    )
  }

  return values.filter(Boolean).join('\n')
}

export async function buildReceiptPdf(
  receipt: AccountOrderReceiptFact,
  copy: ReceiptPdfCopy,
  locale: string = 'en-US'
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const orderNumber = copy.orderNumber(normalize(receipt.displayId) || '--')
  pdf.setTitle(copy.title, { showInWindowTitleBar: true })
  pdf.setSubject(orderNumber)
  pdf.setAuthor(SELLER_NAME)
  pdf.setCreator(SELLER_NAME)
  pdf.setProducer(SELLER_NAME)
  pdf.setLanguage(pdfLanguageTag(locale))
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const fallbackText = collectReceiptText(receipt, copy, locale)
  const fallbacks = await embedUnicodeFallbacks(pdf, fallbackText, locale, [regular, bold])
  const style = (textStyle: TextStyle): TextStyle => ({ ...textStyle, fallbacks })

  const rightEdge = PAGE_WIDTH - MARGIN

  // ── Header ────────────────────────────────────────────────────────────
  let y = PAGE_HEIGHT - 78
  drawLeft(page, SELLER_NAME, MARGIN, y, style({ font: bold, size: 22 }))
  drawLeft(page, SELLER_WEBSITE, MARGIN, y - 16, style({ font: regular, size: 9, color: MUTED }))

  drawRight(page, copy.title, rightEdge, y, style({ font: bold, size: 22 }))
  drawRight(page, orderNumber, rightEdge, y - 16, style({
    font: regular,
    size: 10,
    color: MUTED,
  }))

  y -= 42
  drawRule(page, y)

  // ── Billed to / order details columns ─────────────────────────────────
  y -= 26
  const detailX = 330
  const columnTop = y

  drawLeft(page, copy.billedTo, MARGIN, y, style({ font: bold, size: 8, color: FAINT }))
  y -= 16

  const billingLines: Array<{ text: string; isName?: boolean }> = []
  const company = normalize(receipt.billingProfile.company)
  if (company) billingLines.push({ text: company, isName: true })
  const customerName = normalize(receipt.customerName)
  if (customerName) billingLines.push({ text: customerName, isName: true })
  const email = normalize(receipt.customerEmail)
  billingLines.push({
    text: email || copy.noEmailProvided,
    isName: !company && !customerName,
  })

  const addressLines = billingAddressLines(receipt.billingProfile, locale)
  const taxNumber = normalize(receipt.billingProfile.taxNumber)

  for (const line of addressLines) {
    billingLines.push({ text: line })
  }
  if (taxNumber) billingLines.push({ text: copy.taxId(taxNumber) })

  // Keep billed-to text clear of the DETAILS column that shares these rows.
  const billedToWidth = detailX - MARGIN - 16
  for (const line of billingLines) {
    const font = line.isName ? bold : regular
    drawLeft(page, truncateToWidth(font, line.text, 10, billedToWidth, fallbacks), MARGIN, y, style({
      font,
      size: 10,
      color: line.isName ? INK : MUTED,
    }))
    y -= 14
  }

  let detailY = columnTop
  drawLeft(page, copy.details, detailX, detailY, style({ font: bold, size: 8, color: FAINT }))
  detailY -= 16

  const detailRows: Array<[string, string]> = []
  detailRows.push([copy.orderDate, formatDateForLocale(receipt.createdAt, locale)])
  const payment = paymentLabel(receipt.paymentStatus, copy)
  if (payment) detailRows.push([copy.payment, payment])
  detailRows.push([copy.currency, normalize(receipt.currencyCode).toUpperCase() || '--'])

  for (const [label, value] of detailRows) {
    drawLeft(page, label, detailX, detailY, style({ font: regular, size: 10, color: MUTED }))
    drawLeft(page, value, detailX + 80, detailY, style({ font: regular, size: 10 }))
    detailY -= 14
  }

  y = Math.min(y, detailY) - 14

  // ── Legacy order-number notice ────────────────────────────────────────
  // Orders migrated from the old WooCommerce store carried a different
  // order number. Flag it so customers can reconcile older records.
  const legacyDisplayId = receipt.legacyDisplayId
  if (legacyDisplayId) {
    const noticeText = copy.legacyNotice(legacyDisplayId)
    const noticeLines = wrapText(regular, noticeText, 9, rightEdge - MARGIN - 24, fallbacks)
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
      drawLeft(page, line, MARGIN + 12, noticeY, style({ font: regular, size: 9, color: MUTED }))
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

  drawLeft(page, copy.description, MARGIN, y, style({ font: bold, size: 8, color: FAINT }))
  drawRight(page, copy.quantity, qtyRight, y, style({ font: bold, size: 8, color: FAINT }))
  drawRight(page, copy.unitPrice, unitRight, y, style({ font: bold, size: 8, color: FAINT }))
  drawRight(page, copy.amount, amountRight, y, style({ font: bold, size: 8, color: FAINT }))
  y -= 8
  drawRule(page, y)
  y -= 18

  for (const item of receipt.items ?? []) {
    const itemTitle =
      typeof item?.title === 'string' && item.title.trim()
        ? item.title.trim()
        : copy.untitledItem

    // Keep the title clear of the right-aligned QTY column on the same row.
    const titleWidth = qtyRight - MARGIN - 30
    drawLeft(page, truncateToWidth(regular, itemTitle, 10, titleWidth, fallbacks), MARGIN, y, style({
      font: regular,
      size: 10,
    }))
    drawRight(page, normalize(item.quantity) || '--', qtyRight, y, style({
      font: regular,
      size: 10,
    }))
    drawRight(page, formatAmount(item.unitPrice, receipt.currencyCode, locale), unitRight, y, style({
      font: regular,
      size: 10,
    }))
    drawRight(page, formatAmount(item.total, receipt.currencyCode, locale), amountRight, y, style({
      font: regular,
      size: 10,
    }))
    y -= 18
  }

  y += 4
  drawRule(page, y)

  // ── Totals ────────────────────────────────────────────────────────────
  const totalsLabelX = 380
  y -= 20

  drawLeft(page, copy.subtotal, totalsLabelX, y, style({ font: regular, size: 10, color: MUTED }))
  drawRight(page, formatAmount(receipt.totals.subtotal, receipt.currencyCode, locale), amountRight, y, style({
    font: regular,
    size: 10,
  }))
  y -= 16

  // No GST registration → tax is always zero; only render a tax row in the
  // unexpected case a nonzero amount ever appears, so it's never hidden.
  const taxAmount =
    typeof receipt.totals.tax === 'number' && Number.isFinite(receipt.totals.tax)
      ? receipt.totals.tax
      : 0
  if (taxAmount > 0) {
    drawLeft(page, copy.tax, totalsLabelX, y, style({ font: regular, size: 10, color: MUTED }))
    drawRight(page, formatAmount(taxAmount, receipt.currencyCode, locale), amountRight, y, style({
      font: regular,
      size: 10,
    }))
    y -= 16
  }

  drawRule(page, y + 4, totalsLabelX, amountRight)
  y -= 8
  drawLeft(page, copy.total, totalsLabelX, y, style({ font: bold, size: 12 }))
  drawRight(page, formatAmount(receipt.totals.total, receipt.currencyCode, locale), amountRight, y, style({
    font: bold,
    size: 12,
  }))
  for (const refund of receipt.refunds) {
    if (y - 30 - (taxAmount <= 0 ? 16 : 0) < MARGIN + 4 * 13 + 14) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - 78
    }
    y -= 16
    drawLeft(page, copy.refund, totalsLabelX, y, style({ font: regular, size: 10, color: MUTED }))
    drawRight(page, formatAmount(-Math.abs(refund.amount), receipt.currencyCode, locale), amountRight, y, style({ font: regular, size: 10 }))
    y -= 14
    drawLeft(page, copy.refundDate, totalsLabelX, y, style({ font: regular, size: 9, color: MUTED }))
    drawRight(page, formatDateForLocale(refund.createdAt, locale), amountRight, y, style({ font: regular, size: 9, color: MUTED }))
  }
  // Only reassure "no tax" when no Tax row was drawn — otherwise the receipt
  // would show a Tax line and a contradicting "no tax" note directly below it.
  if (taxAmount <= 0) {
    y -= 16
    drawRight(page, copy.noTaxAdded, amountRight, y, style({
      font: regular,
      size: 8.5,
      color: MUTED,
    }))
  }

  // ── Footer ────────────────────────────────────────────────────────────
  const footerLines: Array<{ text: string; style: TextStyle }> = []
  const sellerIdentity = copy.sellerIdentity(SELLER_NAME, SELLER_ABN || null)
  footerLines.push({ text: sellerIdentity, style: { font: bold, size: 9 } })
  footerLines.push({
    text: copy.gstNotice(SELLER_NAME),
    style: { font: regular, size: 9, color: MUTED },
  })
  footerLines.push({
    text: copy.proofOfPurchase,
    style: { font: regular, size: 9, color: MUTED },
  })
  footerLines.push({
    text: copy.questions(`${SELLER_WEBSITE}/discord`, SELLER_EMAIL),
    style: { font: regular, size: 9, color: MUTED },
  })

  let footerY = MARGIN + footerLines.length * 13
  drawRule(page, footerY + 14)
  drawRight(page, copy.generated(formatDateForLocale(new Date().toISOString(), locale)), rightEdge, footerY, style({
    font: regular,
    size: 8,
    color: FAINT,
  }))
  for (const line of footerLines) {
    drawLeft(page, line.text, MARGIN, footerY, style(line.style))
    footerY -= 13
  }

  return pdf.save({
    useObjectStreams: false,
  })
}
