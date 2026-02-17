import type { MedusaOrder } from './medusa-auth'
import { formatOrderAmount } from './order-display'

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function buildPdfFromLines(lines: string[]): Uint8Array {
  const textLines = lines.map((line) => `(${escapePdfText(line)}) Tj`)
  const textContent = [
    'BT',
    '/F1 12 Tf',
    '50 760 Td',
    ...textLines.flatMap((line, index) =>
      index === 0 ? [line] : ['0 -18 Td', line]
    ),
    'ET',
  ].join('\n')

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj',
    `4 0 obj << /Length ${Buffer.byteLength(textContent, 'utf8')} >> stream\n${textContent}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += `${object}\n`
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`
  pdf += `startxref\n${xrefStart}\n%%EOF`

  return Buffer.from(pdf, 'utf8')
}

export function buildTaxReceiptPdf(order: MedusaOrder): Uint8Array {
  const lines: string[] = [
    'WCPOS - Tax Receipt',
    `Order #: ${order.display_id}`,
    `Order ID: ${order.id}`,
    `Date: ${new Date(order.created_at).toLocaleDateString('en-US')}`,
    `Customer: ${order.email}`,
    '',
    'Items:',
  ]

  for (const item of order.items) {
    lines.push(
      `${item.title} x${item.quantity} - ${formatOrderAmount(
        item.total,
        order.currency_code
      )}`
    )
  }

  lines.push('')
  lines.push(`Subtotal: ${formatOrderAmount(order.subtotal, order.currency_code)}`)
  lines.push(`Tax: ${formatOrderAmount(order.tax_total, order.currency_code)}`)
  lines.push(`Total: ${formatOrderAmount(order.total, order.currency_code)}`)

  return buildPdfFromLines(lines)
}
