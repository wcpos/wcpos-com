'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Monitor } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getLicenseDisplayStatus,
  getPolicyPlanName,
  getStatusColorClasses,
  maskLicenseKey,
} from '@/lib/license-display'
import { formatDateForLocale } from '@/lib/date-format'
import type { LicenseDetail, LicenseMachine } from '@/types/license'

/**
 * License row for the admin browser. Machines are pre-fetched server-side;
 * null means the machines lookup failed for that license.
 */
export type AdminLicenseRow = Omit<LicenseDetail, 'machines'> & {
  machines: LicenseMachine[] | null
}

interface AdminLicensesTableProps {
  licenses: AdminLicenseRow[]
}

export function AdminLicensesTable({ licenses }: AdminLicensesTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Captured once per mount so render stays pure for the React compiler.
  const [now] = useState(() => Date.now())

  if (licenses.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No licenses found.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Key</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expiry</TableHead>
          <TableHead>Machines</TableHead>
          <TableHead>Policy</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {licenses.map((license) => {
          const displayStatus = getLicenseDisplayStatus(
            license.status,
            license.expiry,
            now
          )
          const isExpanded = expandedId === license.id

          return (
            <LicenseRows
              key={license.id}
              license={license}
              displayStatus={displayStatus}
              isExpanded={isExpanded}
              onToggle={() =>
                setExpandedId(isExpanded ? null : license.id)
              }
            />
          )
        })}
      </TableBody>
    </Table>
  )
}

function LicenseRows({
  license,
  displayStatus,
  isExpanded,
  onToggle,
}: {
  license: AdminLicenseRow
  displayStatus: string
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <TableCell>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell>
          <code className="font-mono text-xs">
            {maskLicenseKey(license.key)}
          </code>
        </TableCell>
        <TableCell>
          <span
            className={`rounded px-2 py-1 text-xs font-medium capitalize ${getStatusColorClasses(displayStatus)}`}
          >
            {displayStatus}
          </span>
        </TableCell>
        <TableCell>
          {license.expiry
            ? formatDateForLocale(license.expiry, 'en')
            : 'Never'}
        </TableCell>
        <TableCell>
          {license.machines === null
            ? '—'
            : `${license.machines.length} of ${license.maxMachines}`}
        </TableCell>
        <TableCell>{getPolicyPlanName(license.policyId)}</TableCell>
        <TableCell>{formatDateForLocale(license.createdAt, 'en')}</TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={7} className="bg-muted/30 p-4">
            <MachinesDetail machines={license.machines} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function MachinesDetail({ machines }: { machines: LicenseMachine[] | null }) {
  if (machines === null) {
    return (
      <p className="text-sm text-destructive">
        Failed to load machines for this license.
      </p>
    )
  }

  if (machines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activated machines.</p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Activated machines</p>
      {machines.map((machine) => (
        <div
          key={machine.id}
          className="flex items-center gap-2 rounded-lg bg-muted p-3"
        >
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {machine.name || machine.fingerprint}
            </p>
            {machine.name && (
              <p className="text-xs text-muted-foreground">
                {machine.fingerprint}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Added {formatDateForLocale(machine.createdAt, 'en')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
