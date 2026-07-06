import 'server-only'

import type { MedusaOrder, MedusaOrderItem } from './customer-orders'
import type { CanonicalLicenseStatus } from './license-status'
import type { LicenseDetail } from '@/types/license'
import { getLicenseDisplayStatus } from './license'
import {
  extractLicenseReferencesFromOrders,
  type LicenseReference,
} from './licenses'
import { maskLicenseKey } from './order-display'
import { getOrderDisplayStatus } from './order-status'

export interface AccountOrderMoneyFact {
  amount: number
  currencyCode: string
}

export interface AccountOrderListRowFact {
  id: string
  displayId: number
  createdAt: string
  itemCount: number
  displayStatus: string
  total: AccountOrderMoneyFact
  licenses: Array<{
    maskedKey: string
    product?: string
  }>
}

export interface AccountOrderDetailFact {
  id: string
  displayId: number
  createdAt: string
  email: string
  displayStatus: string
  total: AccountOrderMoneyFact
  items: Array<{
    id: string
    title: string
    quantity: number
    total: AccountOrderMoneyFact
  }>
  licenseEntitlements: Array<{
    id: string
    maskedKey: string
    status: CanonicalLicenseStatus
    product?: string
  }>
  /**
   * Full keys intentionally exposed only to the private Order detail surface so
   * the Customer can retrieve the activation credential issued by this Order.
   */
  activationKeys: Array<{
    id?: string
    key: string
  }>
}

export interface AccountOrderReceiptProfileFact {
  countryCode: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  region: string | null
  postalCode: string | null
  taxNumber: string | null
}

export interface AccountOrderReceiptFact {
  displayId: number
  createdAt: string
  customerEmail: string
  currencyCode: string
  billingProfile: AccountOrderReceiptProfileFact
  items: Array<{
    title: string
    quantity: number
    unitPrice: number
    total: number
  }>
  totals: {
    subtotal: number
    tax: number
    total: number
  }
}

function money(amount: number, currencyCode: string): AccountOrderMoneyFact {
  return { amount, currencyCode }
}

function productForOrder(order: MedusaOrder): string | undefined {
  if (order.items.length !== 1) return undefined
  const title = order.items[0]?.title?.trim()
  return title || undefined
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function legacyDisplayId(order: MedusaOrder): number {
  const value = order.metadata?.wc_order_id
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    const parsed = Number.parseInt(trimmed, 10)
    if (String(parsed) === trimmed && parsed > 0) {
      return parsed
    }
  }

  return order.display_id
}

function legacyCreatedAt(order: MedusaOrder): string {
  return (
    normalizeLegacyDate(
      stringOrNull(order.metadata?.wc_order_date_gmt) ??
        stringOrNull(order.metadata?.wc_order_date)
    ) ?? order.created_at
  )
}

function normalizeLegacyDate(value: string | null): string | null {
  if (!value) return null
  if (value.includes('T')) return value

  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})(?:\.\d+)?$/
  )
  if (!match) return value

  return `${match[1]}T${match[2]}Z`
}

function referenceIdentity(reference: LicenseReference): string {
  return reference.id ? `id:${reference.id}` : `key:${reference.key}`
}

function uniqueLicenseReferences(order: MedusaOrder): LicenseReference[] {
  const unique = new Map<string, LicenseReference>()
  for (const reference of extractLicenseReferencesFromOrders([order])) {
    const identity = referenceIdentity(reference)
    const existing = unique.get(identity)
    if (!existing) {
      unique.set(identity, reference)
      continue
    }

    unique.set(identity, {
      ...reference,
      id: reference.id ?? existing.id,
      key: reference.key ?? existing.key,
    })
  }
  return Array.from(unique.values())
}

function projectItemTotal(
  item: MedusaOrderItem,
  currencyCode: string
): AccountOrderDetailFact['items'][number] {
  return {
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    total: money(item.total, currencyCode),
  }
}

export function projectAccountOrderListRow(
  order: MedusaOrder
): AccountOrderListRowFact {
  const product = productForOrder(order)
  const licenses = uniqueLicenseReferences(order)
    .filter((reference): reference is LicenseReference & { key: string } =>
      Boolean(reference.key)
    )
    .map((reference) => ({
      maskedKey: maskLicenseKey(reference.key),
      ...(product ? { product } : {}),
    }))

  return {
    id: order.id,
    displayId: legacyDisplayId(order),
    createdAt: legacyCreatedAt(order),
    itemCount: order.items.length,
    displayStatus: getOrderDisplayStatus(order),
    total: money(order.total, order.currency_code),
    licenses,
  }
}

export function projectAccountOrderListRows(
  orders: MedusaOrder[]
): AccountOrderListRowFact[] {
  return orders
    .map(projectAccountOrderListRow)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export function projectAccountOrderDetail(
  order: MedusaOrder,
  resolvedLicenses: LicenseDetail[],
  nowMs: number
): AccountOrderDetailFact {
  const product = productForOrder(order)
  const activationKeys = uniqueLicenseReferences(order)
    .filter(
      (reference): reference is LicenseReference & { id: string; key: string } =>
        Boolean(reference.id && reference.key)
    )
    .map((reference) => ({
      id: reference.id,
      key: reference.key,
    }))

  return {
    id: order.id,
    displayId: legacyDisplayId(order),
    createdAt: legacyCreatedAt(order),
    email: order.email,
    displayStatus: getOrderDisplayStatus(order),
    total: money(order.total, order.currency_code),
    items: order.items.map((item) => projectItemTotal(item, order.currency_code)),
    licenseEntitlements: resolvedLicenses.map((license) => ({
      id: license.id,
      maskedKey: maskLicenseKey(license.key),
      status: getLicenseDisplayStatus(license, nowMs),
      ...(product ? { product } : {}),
    })),
    activationKeys,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function projectReceiptProfile(
  metadata: Record<string, unknown> | undefined
): AccountOrderReceiptProfileFact {
  const accountProfile = isRecord(metadata?.account_profile)
    ? metadata.account_profile
    : {}

  return {
    countryCode: stringOrNull(accountProfile.countryCode),
    addressLine1: stringOrNull(accountProfile.addressLine1),
    addressLine2: stringOrNull(accountProfile.addressLine2),
    city: stringOrNull(accountProfile.city),
    region: stringOrNull(accountProfile.region),
    postalCode: stringOrNull(accountProfile.postalCode),
    taxNumber: stringOrNull(accountProfile.taxNumber),
  }
}

export function projectAccountOrderReceipt(
  order: MedusaOrder,
  billingProfile: AccountOrderReceiptProfileFact
): AccountOrderReceiptFact {
  return {
    displayId: legacyDisplayId(order),
    createdAt: legacyCreatedAt(order),
    customerEmail: order.email,
    currencyCode: order.currency_code,
    billingProfile,
    items: order.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.total,
    })),
    totals: {
      subtotal: order.subtotal,
      tax: order.tax_total,
      total: order.total,
    },
  }
}
