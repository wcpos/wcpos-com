import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin-auth'
import {
  medusaAdminClient,
  type AdminCustomerDetail,
  type AdminOrderSummary,
} from '@/services/core/external/medusa-admin-client'
import { extractLicenseReferencesFromOrders } from '@/lib/licenses'
import { resolveLicenseReferences } from '@/lib/customer-licenses'
import {
  getLicenseDisplayStatus,
  getPolicyPlanName,
  getStatusColorClasses,
  maskLicenseKey,
} from '@/lib/license-display'
import { formatOrderAmount } from '@/lib/order-display'
import { getOrderDisplayStatus } from '@/lib/order-status'
import { formatDateForLocale } from '@/lib/date-format'
import {
  MedusaAdminUnconfiguredCard,
  StateCard,
} from '@/components/admin/state-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Cap: enough for every real customer; avoids paging loops on a detail page.
const ORDERS_PAGE_SIZE = 50

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

function ProfileCard({ customer }: { customer: AdminCustomerDetail }) {
  const name = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(' ')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Field label="Email" value={customer.email ?? '—'} />
        <Field label="Name" value={name || '—'} />
        <Field label="Company" value={customer.companyName ?? '—'} />
        <Field label="Phone" value={customer.phone ?? '—'} />
        <Field
          label="Account"
          value={customer.hasAccount ? 'Registered' : 'Guest'}
        />
        <Field
          label="Created"
          value={
            customer.createdAt
              ? formatDateForLocale(customer.createdAt, 'en')
              : '—'
          }
        />
        <Field
          label="Updated"
          value={
            customer.updatedAt
              ? formatDateForLocale(customer.updatedAt, 'en')
              : '—'
          }
        />
      </CardContent>
    </Card>
  )
}

function MetadataCard({
  metadata,
}: {
  metadata: Record<string, unknown> | null
}) {
  const entries = Object.entries(metadata ?? {})

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Billing metadata</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No metadata.</p>
        ) : (
          <dl className="space-y-2">
            {entries.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 text-sm">
                <dt className="font-mono text-muted-foreground">{key}</dt>
                <dd className="max-w-xs break-words text-right">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}

function OrdersCard({ orders }: { orders: AdminOrderSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Orders ({orders.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      #{order.displayId ?? order.id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {getOrderDisplayStatus({
                      status: order.status,
                      payment_status: order.paymentStatus ?? undefined,
                    })}
                  </TableCell>
                  <TableCell>
                    {formatOrderAmount(order.total, order.currencyCode)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {order.createdAt
                      ? formatDateForLocale(order.createdAt, 'en')
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

interface CustomerLicenseRow {
  id: string
  maskedKey: string
  displayStatus: string
  planName: string
  expiry: string | null
}

/**
 * Extract license references from the customer's orders and resolve them
 * against Keygen, projecting onto display rows with the key already masked.
 * Lives outside the component so render stays pure (react-hooks/purity).
 */
async function loadCustomerLicenseRows(
  orders: AdminOrderSummary[]
): Promise<CustomerLicenseRow[]> {
  const references = extractLicenseReferencesFromOrders(orders)
  const licenses = await resolveLicenseReferences(references)
  const nowMs = Date.now()

  return licenses.map((license) => ({
    id: license.id,
    // Masked server-side; the raw key is never rendered.
    maskedKey: maskLicenseKey(license.key),
    displayStatus: getLicenseDisplayStatus(license.status, license.expiry, nowMs),
    planName: getPolicyPlanName(license.policyId),
    expiry: license.expiry,
  }))
}

async function LicensesCard({ orders }: { orders: AdminOrderSummary[] }) {
  const licenses = await loadCustomerLicenseRows(orders)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Licenses ({licenses.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {licenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No license references found in this customer&apos;s orders.
          </p>
        ) : (
          <ul className="space-y-2">
            {licenses.map((license) => (
              <li
                key={license.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <code className="font-mono">{license.maskedKey}</code>
                <span
                  className={`rounded px-2 py-1 text-xs font-medium capitalize ${getStatusColorClasses(license.displayStatus)}`}
                >
                  {license.displayStatus}
                </span>
                <span className="text-muted-foreground">
                  {license.planName}
                </span>
                <span className="text-muted-foreground">
                  {license.expiry
                    ? `Expires ${formatDateForLocale(license.expiry, 'en')}`
                    : 'No expiry'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; customerId: string }>
}) {
  const { locale, customerId } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const result = await medusaAdminClient.getCustomerById(customerId)

  if (result.status === 'not_found') {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/customers"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to customers
      </Link>

      {result.status === 'unconfigured' && <MedusaAdminUnconfiguredCard />}

      {result.status === 'error' && (
        <StateCard title="Failed to load customer" detail={result.message} />
      )}

      {result.status === 'ok' && (
        <CustomerDetailContent customer={result.item} />
      )}
    </div>
  )
}

async function CustomerDetailContent({
  customer,
}: {
  customer: AdminCustomerDetail
}) {
  const ordersResult = await medusaAdminClient.listOrders({
    customerId: customer.id,
    pageSize: ORDERS_PAGE_SIZE,
  })

  return (
    <>
      <h1 className="text-2xl font-bold">
        {customer.email ?? customer.id}
      </h1>

      <div className="grid gap-4 md:grid-cols-2">
        <ProfileCard customer={customer} />
        <MetadataCard metadata={customer.metadata} />
      </div>

      {ordersResult.status !== 'ok' ? (
        <StateCard
          title="Failed to load orders"
          detail={
            ordersResult.status === 'error'
              ? ordersResult.message
              : 'Medusa admin access not configured.'
          }
        />
      ) : (
        <>
          <OrdersCard orders={ordersResult.items} />
          <LicensesCard orders={ordersResult.items} />
        </>
      )}
    </>
  )
}
