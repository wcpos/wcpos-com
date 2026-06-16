import { Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type AccountNoticeVariant = 'warning' | 'neutral'

const VARIANT_CLASSES: Record<AccountNoticeVariant, string> = {
  warning:
    'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200',
  neutral: 'border-border bg-muted/60 text-foreground',
}

const VARIANT_ICON_CLASSES: Record<AccountNoticeVariant, string> = {
  warning: 'text-amber-600 dark:text-amber-400',
  neutral: 'text-muted-foreground',
}

interface AccountNoticeProps {
  variant?: AccountNoticeVariant
  /** The message. Rendered inside a <p> with flex-friendly wrapping. */
  children: React.ReactNode
  /** Optional action slot (button/link), kept on the same row when it fits. */
  action?: React.ReactNode
  className?: string
}

/**
 * Lifecycle/status notice used across the account area (expiry warnings,
 * suspended/revoked/unverifiable banners, empty-license prompts). Purely
 * presentational — show/hide conditions live with the callers and are
 * truth-tabled in their tests.
 */
export function AccountNotice({
  variant = 'warning',
  children,
  action,
  className,
}: AccountNoticeProps) {
  const Icon = variant === 'warning' ? TriangleAlert : Info
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm sm:p-4',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <Icon
          aria-hidden="true"
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0',
            VARIANT_ICON_CLASSES[variant]
          )}
        />
        <p className="min-w-0 leading-relaxed">{children}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
