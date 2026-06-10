import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { licenseClient } from '@/services/core/external/license-client'
import {
  AdminLicensesTable,
  type AdminLicenseRow,
} from '@/components/admin/admin-licenses-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const PAGE_SIZE = 20

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '1', 10)
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed
}

async function fetchLicensesPage(page: number): Promise<
  | { ok: true; rows: AdminLicenseRow[]; hasNextPage: boolean }
  | { ok: false }
> {
  try {
    const result = await licenseClient.listLicenses(page, PAGE_SIZE)

    // Machines are not included in the Keygen list response; fetch per
    // license in parallel. A single failed lookup renders as "—" rather
    // than failing the whole page.
    const machines = await Promise.all(
      result.items.map((license) =>
        licenseClient.getLicenseMachines(license.id).catch(() => null)
      )
    )

    const rows: AdminLicenseRow[] = result.items.map((license, index) => ({
      ...license,
      machines: machines[index],
    }))

    return { ok: true, rows, hasNextPage: result.hasNextPage }
  } catch {
    return { ok: false }
  }
}

export default async function AdminLicensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const { page: pageParam } = await searchParams
  const page = parsePage(pageParam)

  const result = await fetchLicensesPage(page)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Licenses</h1>

      {!result.ok ? (
        <Card>
          <CardContent className="py-8 text-center text-sm">
            <p className="font-medium text-destructive">
              Failed to load licenses from the license server.
            </p>
            <p className="mt-1 text-muted-foreground">
              The license server may be unreachable, or this Keygen CE
              deployment may not allow listing licenses with the configured
              token.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="pt-6">
              <AdminLicensesTable licenses={result.rows} />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/licenses?page=${page - 1}`}>
                    Previous
                  </Link>
                </Button>
              )}
              {result.hasNextPage && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/licenses?page=${page + 1}`}>Next</Link>
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
