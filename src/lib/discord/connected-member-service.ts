import 'server-only'

import type { LicenseDetail } from '@/types/license'
import type { LicenseLifecycle } from '@/lib/license'
import { isLicenseActive } from '@/lib/license'
import {
  addConnectedDiscordMember,
  getConnectedDiscordAccess,
  hasConnectedDiscordMember,
  isDiscordUserBlockedForLicence,
  removeConnectedDiscordMember,
  type ConnectedDiscordIdentity,
} from './connected-members'

export interface ConnectedMemberView {
  id: string
  handle: string
  avatarUrl: string | null
  connectedAt: string
}

export interface LicenceDiscordAccessView {
  licenseId: string
  seatCap: number
  usedSeats: number
  members: ConnectedMemberView[]
}

export type DiscordClaimResult =
  | { status: 'claimed'; licenseId: string; memberId: string }
  | { status: 'already_connected'; licenseId: string; memberId: string }
  | { status: 'invalid_license' }
  | { status: 'license_not_active'; licenseId: string }
  | { status: 'blocked'; licenseId: string }
  | { status: 'seat_cap_reached'; licenseId: string }

export type DiscordRemoveResult =
  | { status: 'removed'; discordUserId: string }
  | { status: 'license_not_found' }
  | { status: 'member_not_found' }

interface ClaimDependencies {
  now(): Date
  validateLicenseKey(key: string): Promise<{
    valid: boolean
    code: string
    detail: string
    license?: Omit<LicenseDetail, 'machines'>
  }>
  updateLicenseMetadata(licenseId: string, metadata: Record<string, unknown>): Promise<LicenseDetail>
}

interface RemoveDependencies {
  now(): Date
  updateLicenseMetadata(licenseId: string, metadata: Record<string, unknown>): Promise<LicenseDetail>
}

export function getDiscordAccessByLicense(
  licenses: LicenseDetail[]
): Record<string, LicenceDiscordAccessView> {
  return Object.fromEntries(
    licenses.map((license) => {
      const access = getConnectedDiscordAccess(license.metadata)
      return [
        license.id,
        {
          licenseId: license.id,
          seatCap: access.seatCap,
          usedSeats: access.members.length,
          members: access.members.map((member) => ({
            id: member.id,
            handle: member.username ? `@${member.username}` : `Discord user ${member.discordUserId}`,
            avatarUrl: null,
            connectedAt: member.connectedAt,
          })),
        },
      ]
    })
  )
}

export async function claimConnectedDiscordMember({
  licenseKey,
  identity,
  dependencies,
}: {
  licenseKey: string
  identity: Omit<ConnectedDiscordIdentity, 'connectedAt'>
  dependencies: ClaimDependencies
}): Promise<DiscordClaimResult> {
  const validation = await dependencies.validateLicenseKey(licenseKey)
  if (!validation.license) return { status: 'invalid_license' }

  const license = validation.license
  const now = dependencies.now()
  if (!isLicenseActive(license, now.getTime())) {
    return { status: 'license_not_active', licenseId: license.id }
  }

  if (isDiscordUserBlockedForLicence(license.metadata, identity.id)) {
    return { status: 'blocked', licenseId: license.id }
  }

  const access = getConnectedDiscordAccess(license.metadata)
  const existing = access.members.find((member) => member.discordUserId === identity.id)
  if (existing) {
    return { status: 'already_connected', licenseId: license.id, memberId: existing.id }
  }

  if (access.members.length >= access.seatCap) {
    return { status: 'seat_cap_reached', licenseId: license.id }
  }

  const metadata = addConnectedDiscordMember(license.metadata, {
    ...identity,
    connectedAt: now,
  })
  const updated = await dependencies.updateLicenseMetadata(license.id, metadata)
  const member = getConnectedDiscordAccess(updated.metadata).members.find(
    (candidate) => candidate.discordUserId === identity.id
  )
  return {
    status: 'claimed',
    licenseId: license.id,
    memberId: member?.id ?? `discord-member-${identity.id}`,
  }
}

export async function removeConnectedDiscordMemberForHolder({
  licenseId,
  memberId,
  holderLicenses,
  dependencies,
}: {
  licenseId: string
  memberId: string
  holderLicenses: LicenseDetail[]
  dependencies: RemoveDependencies
}): Promise<DiscordRemoveResult> {
  const license = holderLicenses.find((candidate) => candidate.id === licenseId)
  if (!license) return { status: 'license_not_found' }

  const member = getConnectedDiscordAccess(license.metadata).members.find(
    (candidate) => candidate.id === memberId
  )
  if (!member) return { status: 'member_not_found' }

  const metadata = removeConnectedDiscordMember(
    license.metadata,
    memberId,
    dependencies.now()
  )
  await dependencies.updateLicenseMetadata(license.id, metadata)
  return { status: 'removed', discordUserId: member.discordUserId }
}

export function getLicensesForDiscordUser(
  discordUserId: string,
  licenses: LicenseDetail[]
): LicenseLifecycle[] {
  return licenses
    .filter((license) => hasConnectedDiscordMember(license.metadata, discordUserId))
    .map((license) => ({ status: license.status, expiry: license.expiry }))
}

export function getConnectedDiscordUserIds(licenses: LicenseDetail[]): string[] {
  const ids = new Set<string>()
  for (const license of licenses) {
    for (const member of getConnectedDiscordAccess(license.metadata).members) {
      ids.add(member.discordUserId)
    }
  }
  return [...ids]
}
