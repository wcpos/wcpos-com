import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import {
  medusaAdminClient,
  type AdminCustomerSummary,
} from '@/services/core/external/medusa-admin-client'
import {
  MedusaAdminUnconfiguredCard,
  StateCard,
} from '@/components/admin/state-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateForLocale } from '@/lib/date-format'

const PAGE_SIZE = 20

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '1', 10)
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed
}

function customersHref(page: number, q: string | undefined): string {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `/admin/customers?${query}` : '/admin/customers'
}

function customerName(customer: AdminCustomerSummary): string {
  const name = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(' ')
  return name || '—'
}

function CustomersTable({ customers }: { customers: AdminCustomerSummary[] }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {customer.email ?? customer.id}
                  </Link>
                </TableCell>
                <TableCell>{customerName(customer)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.hasAccount ? 'Registered' : 'Guest'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {customer.createdAt
                    ? formatDateForLocale(customer.createdAt, 'en')
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default async function AdminCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const { page: pageParam, q: qParam } = await searchParams
  const page = parsePage(pageParam)
  const q = qParam?.trim() || undefined

  const result = await medusaAdminClient.listCustomers({
    page,
    pageSize: PAGE_SIZE,
    q,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Customers</h1>

      {/* GET form: search stays in the URL, no client JS needed. */}
      <form method="get" action="/admin/customers" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by email or name"
          className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm shadow-sm"
        />
        <Button type="submit" variant="outline" size="sm" className="h-9">
          Search
        </Button>
      </form>

      {result.status === 'unconfigured' && <MedusaAdminUnconfiguredCard />}

      {result.status === 'error' && (
        <StateCard title="Failed to load customers" detail={result.message} />
      )}

      {result.status === 'ok' &&
        (result.items.length === 0 ? (
          <StateCard
            title="No customers found"
            detail={
              q ? `No customers match "${q}".` : 'No customers exist yet.'
            }
          />
        ) : (
          <>
            <CustomersTable customers={result.items} />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {page} · {result.count} customer
                {result.count === 1 ? '' : 's'}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={customersHref(page - 1, q)}>Previous</Link>
                  </Button>
                )}
                {result.hasNextPage && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={customersHref(page + 1, q)}>Next</Link>
                  </Button>
                )}
              </div>
            </div>
          </>
        ))}
    </div>
  )
}
