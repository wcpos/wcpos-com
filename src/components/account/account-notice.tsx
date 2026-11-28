import { Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toneSurface } from '@/components/ui/status-tone'

type AccountNoticeVariant = 'warning' | 'neutral'

// Drawn as the Alert in code (ui/alert.tsx): the tone surface, no edge.
const VARIANT_CLASSES: Record<AccountNoticeVariant, string> = {
  warning: toneSurface.caution,
  neutral: toneSurface.neutral,
}

interface AccountNoticeProps {
  variant?: AccountNoticeVariant
  /** The message. Rendered inside a <p> with flex-friendly wrapping. */
  children: React.ReactNode
  /** Optional action slot (button/link), kept on the same row when it fits. */
  action?: React.ReactNode
  /** Replaces the variant's default leading icon. */
  icon?: React.ReactNode
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
  icon,
  className,
}: AccountNoticeProps) {
  const Icon = variant === 'warning' ? TriangleAlert : Info
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-md p-3 text-sm',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <span aria-hidden="true" className="mt-0.5 shrink-0 [&_svg]:size-4">
          {icon ?? <Icon />}
        </span>
        <p className="min-w-0 leading-relaxed">{children}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
