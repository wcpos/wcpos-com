import { NextResponse } from 'next/server'
import { getCustomer, getCustomerOrderById } from '@/lib/medusa-auth'
import { buildTaxReceiptPdf } from '@/lib/pdf-receipt'
import { apiLogger } from '@/lib/logger'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toReceiptProfile(metadata: Record<string, unknown> | undefined) {
  const accountProfile = isRecord(metadata?.account_profile)
    ? metadata.account_profile
    : {}

  return {
    countryCode:
      typeof accountProfile.countryCode === 'string'
        ? accountProfile.countryCode
        : null,
    addressLine1:
      typeof accountProfile.addressLine1 === 'string'
        ? accountProfile.addressLine1
        : null,
    addressLine2:
      typeof accountProfile.addressLine2 === 'string'
        ? accountProfile.addressLine2
        : null,
    city:
      typeof accountProfile.city === 'string'
        ? accountProfile.city
        : null,
    region:
      typeof accountProfile.region === 'string'
        ? accountProfile.region
        : null,
    postalCode:
      typeof accountProfile.postalCode === 'string'
        ? accountProfile.postalCode
        : null,
    taxNumber:
      typeof accountProfile.taxNumber === 'string'
        ? accountProfile.taxNumber
        : null,
  }
}

function resolveLocale(request: Request): string {
  const header = request.headers.get('accept-language') || ''
  const candidates = header
    .split(',')
    .map((part) => part.split(';')[0]?.trim())
    .filter((value): value is string => Boolean(value) && value !== '*')

  for (const candidate of candidates) {
    try {
      const [canonical] = Intl.getCanonicalLocales(candidate)
      if (canonical) return canonical
    } catch {
      // try next locale candidate
    }
  }

  return 'en-US'
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params

  try {
    const [order, customer] = await Promise.all([
      getCustomerOrderById(orderId),
      getCustomer(),
    ])

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const profile = toReceiptProfile(customer?.metadata)
    const locale = resolveLocale(request)
    const pdf = await buildTaxReceiptPdf(order, profile, locale)
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
