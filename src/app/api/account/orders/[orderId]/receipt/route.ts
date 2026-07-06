import { NextResponse } from 'next/server'
import { createTranslator } from 'next-intl'
import { getOrderById } from '@/lib/customer-orders'
import { getCustomer } from '@/lib/medusa-auth'
import { projectAccountOrderReceipt } from '@/lib/account-order-projection'
import { buildReceiptPdf, type ReceiptPdfCopy } from '@/lib/pdf-receipt'
import { projectAccountProfileForReceipt } from '@/lib/customer-profile-metadata'
import { apiLogger } from '@/lib/logger'
import { defaultLocale, locales, type Locale } from '@/i18n/config'

function resolveLocale(request: Request): { intlLocale: string; messageLocale: Locale } {
  const header = request.headers.get('accept-language') || ''
  const candidates = header
    .split(',')
    .map((part) => part.split(';')[0]?.trim())
    .filter((value): value is string => Boolean(value) && value !== '*')

  for (const candidate of candidates) {
    try {
      const [canonical] = Intl.getCanonicalLocales(candidate)
      const messageLocale = canonical
        .split('-')[0]
        ?.toLowerCase() as Locale | undefined
      if (canonical && messageLocale && locales.includes(messageLocale)) {
        return { intlLocale: canonical, messageLocale }
      }
    } catch {
      // try next locale candidate
    }
  }

  return { intlLocale: defaultLocale, messageLocale: defaultLocale }
}

async function receiptPdfCopy(locale: Locale): Promise<ReceiptPdfCopy> {
  const messages = (await import(`../../../../../../../messages/${locale}.json`)).default
  const t = createTranslator({
    locale,
    messages,
    namespace: 'account.receiptPdf',
  })

  return {
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
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const profile = projectAccountProfileForReceipt(customer?.metadata)
    const receipt = projectAccountOrderReceipt(order, profile, customer)
    const locale = resolveLocale(request)
    const pdf = await buildReceiptPdf(
      receipt,
      await receiptPdfCopy(locale.messageLocale),
      locale.intlLocale
    )
    const pdfBuffer = Buffer.from(pdf)
    const filename = `receipt-${order.display_id}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    apiLogger.error`Receipt generation failed. orderId=${orderId} error=${error}`
    return NextResponse.json(
      { error: 'Failed to generate receipt' },
      { status: 500 }
    )
  }
}
