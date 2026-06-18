/**
 * Status tone tints — the single source of truth for the soft, semantic colour
 * registers used across status pills, block notices and empty states.
 *
 * A `tone` is PURELY presentational: callers map their domain meaning (a
 * licence status, a form error, a success banner) onto one of these registers.
 * The names are visual, not canonical statuses. Consumed by StatusBadge
 * (pill), Alert (block notice) and EmptyState so a tint retune happens once.
 */
export type StatusTone = 'positive' | 'caution' | 'critical' | 'info' | 'neutral'

/** Soft tinted surface (background + text) — for tinted pills and notices. */
export const toneSurface: Record<StatusTone, string> = {
  positive:
    'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  caution:
    'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  critical: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  neutral: 'bg-muted text-muted-foreground',
}

/** Solid accent colour — for leading dots and small fills. */
export const toneDot: Record<StatusTone, string> = {
  positive: 'bg-green-500',
  caution: 'bg-amber-500',
  critical: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-muted-foreground',
}

/** Foreground/icon colour — for an icon drawn on a tinted or plain surface. */
export const toneText: Record<StatusTone, string> = {
  positive: 'text-green-600 dark:text-green-400',
  caution: 'text-amber-600 dark:text-amber-400',
  critical: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
  neutral: 'text-muted-foreground',
}
