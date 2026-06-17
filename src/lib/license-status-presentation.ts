import type { CanonicalLicenseStatus } from './license-status'

export type LicenseStatusTone = 'positive' | 'caution' | 'critical' | 'neutral'

export interface LicenseStatusPresentation {
  /** i18n key under `account.licenseStatus`. */
  labelKey: CanonicalLicenseStatus
  /** Framework-agnostic semantic tone; web maps this through StatusBadge. */
  tone: LicenseStatusTone
  /** Optional i18n key under `account.licenses` for extra context. */
  titleKey?: 'unknownStatusTooltip'
}

const PRESENTATION: Record<CanonicalLicenseStatus, LicenseStatusPresentation> = {
  active: { labelKey: 'active', tone: 'positive' },
  expired: { labelKey: 'expired', tone: 'caution' },
  suspended: { labelKey: 'suspended', tone: 'critical' },
  revoked: { labelKey: 'revoked', tone: 'critical' },
  unknown: {
    labelKey: 'unknown',
    tone: 'neutral',
    titleKey: 'unknownStatusTooltip',
  },
}

export function presentLicenseStatus(
  status: CanonicalLicenseStatus
): LicenseStatusPresentation {
  return PRESENTATION[status]
}
