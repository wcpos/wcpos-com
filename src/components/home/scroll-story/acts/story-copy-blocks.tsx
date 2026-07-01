import { Button } from '@/components/ui/button'
import { storyCopy } from '../copy'

/**
 * Pure copy content for each act — no positioning, no motion. The pinned
 * choreography wraps these in animated overlays; the reduced-motion static
 * variant stacks them in plain sections. Keeping content here means the two
 * variants can never drift.
 */

function Kicker({ children }: { children: React.ReactNode }) {
  // fixed red-400: the stage is always dark, but --wcpos-red-accent only
  // lightens under .dark — in light mode it would sit at 42% lightness on
  // slate-900 and fail contrast
  return (
    <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-red-400">
      {children}
    </p>
  )
}

export function CopyAct1({ headingLevel = 1 }: { headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <>
      <Kicker>{storyCopy.act1.kicker}</Kicker>
      <Heading className="mb-4 text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-5xl lg:text-6xl">
        {storyCopy.act1.heading}
      </Heading>
      <p className="mx-auto mb-7 max-w-xl text-base text-slate-300 md:text-lg">
        {storyCopy.act1.body}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="brand-on-dark" size="xl">
          <a href={storyCopy.act1.demoCta.href}>{storyCopy.act1.demoCta.label}</a>
        </Button>
        <Button asChild variant="brand-outline" size="xl">
          <a href={storyCopy.act1.downloadCta.href}>
            {storyCopy.act1.downloadCta.label}
          </a>
        </Button>
      </div>
    </>
  )
}

export function CopyAct2() {
  return (
    <>
      <Kicker>{storyCopy.act2.kicker}</Kicker>
      <h2 className="mb-3 text-3xl font-bold leading-[1.1] tracking-tight text-white md:text-4xl">
        {storyCopy.act2.heading}
      </h2>
      <p className="mb-4 max-w-md text-base leading-relaxed text-slate-400">
        {storyCopy.act2.body}
      </p>
      <div className="flex flex-wrap gap-2">
        {storyCopy.act2.platforms.map((platform) => (
          <span
            key={platform}
            className="rounded-full border border-slate-600 px-3 py-1 text-[11px] font-semibold text-slate-300"
          >
            {platform}
          </span>
        ))}
      </div>
    </>
  )
}

export function CopyAct3() {
  return (
    <>
      <Kicker>{storyCopy.act3.kicker}</Kicker>
      <h2 className="mb-3 text-3xl font-bold leading-[1.1] tracking-tight text-white md:text-4xl">
        {storyCopy.act3.heading}
      </h2>
      <p className="max-w-md text-base leading-relaxed text-slate-400">
        {storyCopy.act3.body}
      </p>
    </>
  )
}

export function CopyAct4() {
  return (
    <>
      <Kicker>{storyCopy.act4.kicker}</Kicker>
      <h2 className="mb-3 text-3xl font-bold leading-[1.1] tracking-tight text-white md:text-4xl">
        {storyCopy.act4.heading}
      </h2>
      <p className="max-w-md text-base leading-relaxed text-slate-400">
        {storyCopy.act4.body}
      </p>
    </>
  )
}
