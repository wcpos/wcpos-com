import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { storyCopy } from '../copy'

export type CopyTone = 'onDark' | 'onLight'

const toneStyles = {
  onDark: {
    heading: 'text-white',
    body: 'text-slate-300',
    sideBody: 'text-slate-400',
    chip: 'border-slate-600 text-slate-300',
    badges: 'text-slate-300/90',
  },
  onLight: {
    heading: 'text-slate-900',
    body: 'text-slate-600',
    sideBody: 'text-slate-600',
    chip: 'border-slate-300 text-slate-600',
    badges: 'text-slate-600',
  },
} as const

/**
 * Pure copy content for each act — no positioning, no motion. The pinned
 * choreography wraps these in animated overlays; the reduced-motion static
 * variant stacks them in plain sections. Keeping content here means the two
 * variants can never drift.
 */

function Kicker({
  children,
  tone = 'onDark',
}: {
  children: React.ReactNode
  tone?: CopyTone
}) {
  // fixed red-400: the stage is always dark, but --wcpos-red-accent only
  // lightens under .dark — in light mode it would sit at 42% lightness on
  // slate-900 and fail contrast
  return (
    <p
      className={cn(
        'mb-3 text-xs font-bold uppercase tracking-[0.18em]',
        tone === 'onLight' ? 'text-wcpos-red' : 'text-red-400'
      )}
    >
      {children}
    </p>
  )
}

export function CopyAct1({
  headingLevel = 1,
  tone = 'onDark',
}: {
  headingLevel?: 1 | 2
  tone?: CopyTone
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  const t = toneStyles[tone]
  return (
    <>
      <Kicker tone={tone}>{storyCopy.act1.kicker}</Kicker>
      <Heading
        className={cn(
          'mb-4 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl',
          tone === 'onLight' ? 'text-[#3b2a17]' : t.heading
        )}
      >
        {storyCopy.act1.heading}
      </Heading>
      {/* small sizes on the photo go near-black and up a weight: contrast
          from ink and the static copyWash behind, never from text effects */}
      <p
        className={cn(
          'mx-auto mb-7 max-w-xl text-base md:text-lg',
          tone === 'onLight' ? 'font-medium text-[#2a1e10]' : t.body
        )}
      >
        {storyCopy.act1.body}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="brand-on-dark" size="xl">
          <a href={storyCopy.act1.demoCta.href}>{storyCopy.act1.demoCta.label}</a>
        </Button>
        {/* brand-outline is white-on-dark; flip to neutral outline on light */}
        <Button
          asChild
          variant={tone === 'onLight' ? 'outline' : 'brand-outline'}
          size="xl"
        >
          <a href={storyCopy.act1.downloadCta.href}>
            {storyCopy.act1.downloadCta.label}
          </a>
        </Button>
      </div>
      <div
        className={cn(
          'mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs font-medium',
          tone === 'onLight' ? 'font-semibold text-[#2a1e10]' : t.badges
        )}
      >
        {storyCopy.act1.trustBadges.map((badge) => (
          <span key={badge} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-emerald-400" />
            {badge}
          </span>
        ))}
      </div>
    </>
  )
}

export function CopyAct2({ tone = 'onDark' }: { tone?: CopyTone }) {
  const t = toneStyles[tone]
  return (
    <>
      <Kicker tone={tone}>{storyCopy.act2.kicker}</Kicker>
      <h2 className={cn('mb-3 text-3xl font-bold leading-[1.1] tracking-tight md:text-4xl', t.heading)}>
        {storyCopy.act2.heading}
      </h2>
      <p className={cn('mb-4 max-w-md text-base leading-relaxed', t.sideBody)}>
        {storyCopy.act2.body}
      </p>
      <div className="flex flex-wrap gap-2">
        {storyCopy.act2.platforms.map((platform) => (
          <span
            key={platform}
            className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold', t.chip)}
          >
            {platform}
          </span>
        ))}
      </div>
    </>
  )
}

export function CopyAct3({ tone = 'onDark' }: { tone?: CopyTone }) {
  const t = toneStyles[tone]
  return (
    <>
      <Kicker tone={tone}>{storyCopy.act3.kicker}</Kicker>
      <h2 className={cn('mb-3 text-3xl font-bold leading-[1.1] tracking-tight md:text-4xl', t.heading)}>
        {storyCopy.act3.heading}
      </h2>
      <p className={cn('max-w-md text-base leading-relaxed', t.sideBody)}>
        {storyCopy.act3.body}
      </p>
    </>
  )
}

export function CopyAct4({ tone = 'onDark' }: { tone?: CopyTone }) {
  const t = toneStyles[tone]
  return (
    <>
      <Kicker tone={tone}>{storyCopy.act4.kicker}</Kicker>
      <h2 className={cn('mb-3 text-3xl font-bold leading-[1.1] tracking-tight md:text-4xl', t.heading)}>
        {storyCopy.act4.heading}
      </h2>
      <p className={cn('max-w-md text-base leading-relaxed', t.sideBody)}>
        {storyCopy.act4.body}
      </p>
    </>
  )
}
