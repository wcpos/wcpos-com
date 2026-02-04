import { Suspense } from 'react'
import { AdminHeader } from '@/components/admin/header'
import { UsersService } from '@/services/core/users/users-service'
import { UsersTable } from './users-table'

interface UsersPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
  }>
}

async function UsersContent({ searchParams }: UsersPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const search = params.search || ''

  const usersData = await UsersService.getUsers(page, 50, search || undefined)

  return (
    <UsersTable
      users={usersData.users}
      total={usersData.total}
      page={usersData.page}
      pageSize={usersData.pageSize}
      totalPages={usersData.totalPages}
      currentSearch={search}
    />
  )
}

function UsersSkeleton() {
  return <div className="h-96 animate-pulse rounded-lg bg-muted" />
}

export default function UsersPage({ searchParams }: UsersPageProps) {
  return (
    <div className="flex flex-col">
      <AdminHeader
        title="Users"
        description="Manage user accounts and permissions"
      />

      <div className="flex-1 p-6">
        <Suspense fallback={<UsersSkeleton />}>
          <UsersContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  )
}

