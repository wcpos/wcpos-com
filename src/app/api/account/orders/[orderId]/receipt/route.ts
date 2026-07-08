import { NextResponse } from 'next/server'
import { createTranslator } from 'next-intl'
import { getOrderById } from '@/lib/customer-orders'
import { getCustomer } from '@/lib/medusa-auth'
import {
  projectAccountOrderReceipt,
  projectReceiptProfile,
  type AccountOrderReceiptFact,
} from '@/lib/account-order-projection'
import { buildReceiptPdf, type ReceiptPdfCopy } from '@/lib/pdf-receipt'
import { localizeKnownProductTitle } from '@/lib/product-title-display'
import { apiLogger } from '@/lib/logger'
import { defaultLocale, locales, type Locale } from '@/i18n/config'

type ReceiptErrorCode = 'order_not_found' | 'generation_failed'

type ReceiptPdfAssets = {
  copy: ReceiptPdfCopy
  filename: (displayId: string) => string
  productTitles: ReceiptProductTitles
}

function errorResponse(errorCode: ReceiptErrorCode, status: number) {
  return NextResponse.json({ errorCode }, { status })
}

function supportedLocale(value: string | null): { intlLocale: string; messageLocale: Locale } | null {
  if (!value || value === '*') return null

  try {
    const [canonical] = Intl.getCanonicalLocales(value)
    const intlLocale = new Intl.Locale(canonical).baseName
    const messageLocale = intlLocale
      .split('-')[0]
      ?.toLowerCase() as Locale | undefined
    if (canonical && messageLocale && locales.includes(messageLocale)) {
      return { intlLocale, messageLocale }
    }
  } catch {
    return null
  }

  return null
}

function resolveLocale(
  request: Request,
  accountLocale?: unknown
): { intlLocale: string; messageLocale: Locale } {
  const explicitLocale = supportedLocale(new URL(request.url).searchParams.get('locale'))
  if (explicitLocale) return explicitLocale

  const savedLocale =
    typeof accountLocale === 'string' ? supportedLocale(accountLocale) : null
  if (savedLocale) return savedLocale

  const header = request.headers.get('accept-language') || ''
  const candidates = header
    .split(',')
    .map((part, index) => {
      const [language, ...parameters] = part.split(';')
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().toLowerCase().startsWith('q=')
      )
      const quality = qualityParameter
        ? Number.parseFloat(qualityParameter.split('=')[1] || '0')
        : 1

      return {
        language: language?.trim(),
        quality: Number.isFinite(quality) ? quality : 0,
        index,
      }
    })
    .filter(
      (candidate): candidate is {
        language: string
        quality: number
        index: number
      } =>
        Boolean(candidate.language) &&
        candidate.language !== '*' &&
        candidate.quality > 0
    )
    .sort((a, b) => b.quality - a.quality || a.index - b.index)
    .map((candidate) => candidate.language)

  for (const candidate of candidates) {
    const locale = supportedLocale(candidate)
    if (locale) return locale
  }

  return { intlLocale: defaultLocale, messageLocale: defaultLocale }
}

function safeReceiptId(value: unknown): string {
  const id = String(value ?? '').trim()
  return id.replace(/[^A-Za-z0-9_-]+/g, '-') || 'order'
}

function safeLocalizedFilename(value: string, fallbackId: string): string {
  const filename = value
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f/\\?%*:|"<>]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return filename || `receipt-${fallbackId}.pdf`
}

function encodeContentDispositionFilename(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

function receiptContentDisposition(displayId: unknown, localizedFilename: string): string {
  const fallbackId = safeReceiptId(displayId)
  const asciiFilename = `receipt-${fallbackId}.pdf`
  const filename = safeLocalizedFilename(localizedFilename, fallbackId)
  const encodedFilename = encodeContentDispositionFilename(filename)
  const rfc5987ParameterName = String.fromCharCode(102, 105, 108, 101, 110, 97, 109, 101)
  const utf8FileParameter = `${rfc5987ParameterName}*=UTF-8''${encodedFilename}`

  return `attachment; filename="${asciiFilename}"; ${utf8FileParameter}`
}



type ReceiptProductTitles = {
  yearly: string
  lifetime: string
}

function localizeReceiptItemTitles(
  receipt: AccountOrderReceiptFact,
  productTitles: ReceiptProductTitles
): AccountOrderReceiptFact {
  return {
    ...receipt,
    items: receipt.items.map((item) => ({
      ...item,
      title: localizeKnownProductTitle(item.title, productTitles),
    })),
  }
}

async function receiptPdfAssets(locale: Locale): Promise<ReceiptPdfAssets> {
  const messages = (await import(`../../../../../../../messages/${locale}.json`)).default
  const t = createTranslator({
    locale,
    messages,
    namespace: 'account.receiptPdf',
  })
  const rootT = createTranslator({
    locale,
    messages,
  })

  const copy: ReceiptPdfCopy = {
    title: t('title'),
    orderNumber: (id) => t('orderNumber', { id }),
    billedTo: t('billedTo'),
    details: t('details'),
    noEmailProvided: t('noEmailProvided'),
    taxId: (taxNumber) => t('taxId', { taxNumber }),
    orderDate: t('orderDate'),
    payment: t('payment'),
    currency: t('currency'),
    legacyNotice: (legacyDisplayId) => t('legacyNotice', { legacyDisplayId }),
    description: t('description'),
    quantity: t('quantity'),
    unitPrice: t('unitPrice'),
    amount: t('amount'),
    untitledItem: t('untitledItem'),
    subtotal: t('subtotal'),
    tax: t('tax'),
    total: t('total'),
    noTaxAdded: t('noTaxAdded'),
    sellerIdentity: (sellerName, sellerAbn) =>
      sellerAbn
        ? t('sellerIdentityWithAbn', { sellerName, sellerAbn })
        : t('sellerIdentity', { sellerName }),
    gstNotice: (sellerName) => t('gstNotice', { sellerName }),
    proofOfPurchase: t('proofOfPurchase'),
    questions: (website, email) => t('questions', { website, email }),
    generated: (date) => t('generated', { date }),
    paymentStatus: {
      paid: t('paymentStatus.paid'),
      refunded: t('paymentStatus.refunded'),
      partiallyRefunded: t('paymentStatus.partiallyRefunded'),
      canceled: t('paymentStatus.canceled'),
      unknown: t('paymentStatus.unknown'),
    },
  }

  return {
    copy,
    filename: (displayId) => t('filename', { id: safeReceiptId(displayId) }),
    productTitles: {
      yearly: rootT('account.productTitles.yearly'),
      lifetime: rootT('account.productTitles.lifetime'),
    },
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params

  try {
    const [order, customer] = await Promise.all([
      getOrderById(orderId),
      getCustomer(),
    ])

    if (!order) {
      return errorResponse('order_not_found', 404)
    }

    const profile = projectReceiptProfile(customer)
    const receipt = projectAccountOrderReceipt(order, profile, customer)
    const locale = resolveLocale(
      request,
      (customer?.metadata as Record<string, unknown> | undefined)?.locale
    )
    const assets = await receiptPdfAssets(locale.messageLocale)
    const localizedReceipt = localizeReceiptItemTitles(
      receipt,
      assets.productTitles
    )
    const pdf = await buildReceiptPdf(
      localizedReceipt,
      assets.copy,
      locale.intlLocale
    )
    const pdfBuffer = Buffer.from(pdf)
    const contentDisposition = receiptContentDisposition(
      order.display_id,
      assets.filename(String(order.display_id))
    )

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Language': locale.intlLocale,
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    apiLogger.error`Receipt generation failed. orderId=${orderId} error=${error}`
    return errorResponse('generation_failed', 500)
  }
}
