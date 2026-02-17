import { NextResponse } from 'next/server'
import { getCustomerOrders } from '@/lib/medusa-auth'
import { buildTaxReceiptPdf } from '@/lib/pdf-receipt'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params
  const orders = await getCustomerOrders(100)
  const order = orders.find((currentOrder) => currentOrder.id === orderId)

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const pdf = buildTaxReceiptPdf(order)
  const normalizedPdf = new Uint8Array(pdf.byteLength)
  normalizedPdf.set(pdf)
  const pdfBlob = new Blob([normalizedPdf], { type: 'application/pdf' })
  const filename = `receipt-${order.display_id}.pdf`

  return new NextResponse(pdfBlob, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
