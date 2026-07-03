import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconTile } from './icon-tile'

/**
 * FeatureCard — the marketing icon + title + description card that the home
 * features grid and the about values grid each hand-rolled (same shell, two
 * drifting icon treatments and dark backgrounds). Keeps the marketing slate
 * palette deliberately: these cards sit on marketing Section tones, which are
 * still slate-based (the slate→token sweep is a separate, deferred pass).
 */
export interface FeatureCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  icon: LucideIcon
  title: React.ReactNode
  /** Inline marker rendered after the title (e.g. a Pro Badge). */
  badge?: React.ReactNode
  /** 'tile' centres the icon in a brand IconTile; 'plain' draws it bare. */
  iconStyle?: 'tile' | 'plain'
  as?: 'li' | 'div'
  children: React.ReactNode
}

function FeatureCard({
  icon: Icon,
  title,
  badge,
  iconStyle = 'tile',
  as: Tag = 'div',
  className,
  children,
  ...props
}: FeatureCardProps) {
  return (
    <Tag
      className={cn(
        'rounded-md border border-slate-200 bg-white p-6 transition-colors hover:border-foreground/20 dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
      {...props}
    >
      {iconStyle === 'tile' ? (
        <IconTile tone="brand" size="md" className="mb-4">
          <Icon aria-hidden="true" />
        </IconTile>
      ) : (
        <Icon aria-hidden="true" className="mb-4 h-8 w-8 text-wcpos-red" />
      )}
      <h3 className="mb-1.5 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
        {title}
        {badge}
      </h3>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {children}
      </p>
    </Tag>
  )
}

export { FeatureCard }
