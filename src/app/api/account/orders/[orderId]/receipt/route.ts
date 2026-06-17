import { NextResponse } from 'next/server'
import { getOrderById } from '@/lib/customer-orders'
import { getCustomer } from '@/lib/medusa-auth'
import {
  projectAccountOrderReceipt,
  projectReceiptProfile,
} from '@/lib/account-order-projection'
import { buildTaxReceiptPdf } from '@/lib/pdf-receipt'
import { apiLogger } from '@/lib/logger'

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
      getOrderById(orderId),
      getCustomer(),
    ])

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const profile = projectReceiptProfile(customer?.metadata)
    const receipt = projectAccountOrderReceipt(order, profile)
    const locale = resolveLocale(request)
    const pdf = await buildTaxReceiptPdf(receipt, locale)
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
