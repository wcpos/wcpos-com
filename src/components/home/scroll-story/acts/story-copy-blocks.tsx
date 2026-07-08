import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    sideBody: 'text-slate-600',
    chip: 'border-slate-300 text-slate-600',
  },
} as const

/**
 * Pure copy content for each act — no positioning, no motion. The pinned
 * choreography wraps these in animated overlays; the reduced-motion static
 * variant stacks them in plain sections. Keeping content here means the two
 * variants can never drift.
 */

// Act-1 letterpress: a single crisp 1px light shadow, angled down-right, so
// the dark text reads as pressed into the counter. One hard-edged layer —
// blur radii read as glow on the grain and are deliberately absent.
const letterpress = '[text-shadow:1px_1px_0_rgba(255,252,245,0.45)]'
const demoHref = 'https://demo.wcpos.com/pos'
const downloadHref = 'https://wordpress.org/plugins/woocommerce-pos/'

function Kicker({
  children,
  tone = 'onDark',
  className,
}: {
  children: React.ReactNode
  tone?: CopyTone
  className?: string
}) {
  // fixed red-400: the stage is always dark, but --wcpos-red-accent only
  // lightens under .dark — in light mode it would sit at 42% lightness on
  // slate-900 and fail contrast
  return (
    <p
      className={cn(
        'mb-3 text-xs font-bold uppercase tracking-[0.18em]',
        tone === 'onLight' ? 'text-wcpos-red' : 'text-red-400',
        className
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
  const copy = useTranslations('home.story')
  return (
    <>
      <Kicker tone={tone} className={tone === 'onLight' ? letterpress : undefined}>
        {copy('a1.k')}
      </Kicker>
      <Heading
        className={cn(
          'mb-4 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl',
          tone === 'onLight' ? cn('text-[#3b2a17]', letterpress) : t.heading
        )}
      >
        {copy('a1.h')}
      </Heading>
      {/* small sizes on the photo go near-black and up a weight: contrast
          comes from ink and the static copyWash behind; the letterpress edge
          separates the glyphs from the grain */}
      <p
        className={cn(
          'mx-auto mb-7 max-w-xl text-base md:text-lg',
          tone === 'onLight'
            ? cn('font-medium text-[#2a1e10]', letterpress)
            : toneStyles.onDark.body
        )}
      >
        {copy('a1.b')}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="brand-on-dark" size="xl">
          <a href={demoHref}>{copy('a1.c1')}</a>
        </Button>
        {/* brand-outline is white-on-dark; flip to neutral outline on light */}
        <Button
          asChild
          variant={tone === 'onLight' ? 'outline' : 'brand-outline'}
          size="xl"
        >
          <a href={downloadHref}>{copy('a1.c2')}</a>
        </Button>
      </div>
      <div
        className={cn(
          'mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs font-medium',
          tone === 'onLight'
            ? cn('font-semibold text-[#2a1e10]', letterpress)
            : toneStyles.onDark.badges
        )}
      >
        {(['b1', 'b2', 'b3'] as const).map((badge) => (
          <span key={badge} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-emerald-400" />
            {copy(`a1.badges.${badge}`)}
          </span>
        ))}
      </div>
    </>
  )
}

export function CopyAct2({ tone = 'onDark' }: { tone?: CopyTone }) {
  const t = toneStyles[tone]
  const copy = useTranslations('home.story')
  return (
    <>
      <Kicker tone={tone}>{copy('a2.k')}</Kicker>
      <h2 className={cn('mb-3 text-3xl font-bold leading-[1.1] tracking-tight md:text-4xl', t.heading)}>
        {copy('a2.h')}
      </h2>
      <p className={cn('mb-4 max-w-md text-base leading-relaxed', t.sideBody)}>
        {copy('a2.b')}
      </p>
      <div className="flex flex-wrap gap-2">
        {(['p1', 'p2', 'p3', 'p4', 'p5'] as const).map((platform) => (
          <span
            key={platform}
            className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold', t.chip)}
          >
            {copy(`a2.platforms.${platform}`)}
          </span>
        ))}
      </div>
    </>
  )
}

export function CopyAct3({ tone = 'onDark' }: { tone?: CopyTone }) {
  const t = toneStyles[tone]
  const copy = useTranslations('home.story')
  return (
    <>
      <Kicker tone={tone}>{copy('a3.k')}</Kicker>
      <h2 className={cn('mb-3 text-3xl font-bold leading-[1.1] tracking-tight md:text-4xl', t.heading)}>
        {copy('a3.h')}
      </h2>
      <p className={cn('max-w-md text-base leading-relaxed', t.sideBody)}>
        {copy('a3.b')}
      </p>
    </>
  )
}

export function CopyAct4({ tone = 'onDark' }: { tone?: CopyTone }) {
  const t = toneStyles[tone]
  const copy = useTranslations('home.story')
  return (
    <>
      <Kicker tone={tone}>{copy('a4.k')}</Kicker>
      <h2 className={cn('mb-3 text-3xl font-bold leading-[1.1] tracking-tight md:text-4xl', t.heading)}>
        {copy('a4.h')}
      </h2>
      <p className={cn('max-w-md text-base leading-relaxed', t.sideBody)}>
        {copy('a4.b')}
      </p>
    </>
  )
}
