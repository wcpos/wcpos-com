import { Button, type ButtonProps } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { Link } from '@/i18n/navigation'

/**
 * CtaBand — the dark closing call-to-action band. Home and About each built
 * the same Section/SectionHeading/button-row arrangement by hand; this owns
 * that arrangement so the two bands can't drift. External hrefs render a
 * plain <a>; everything else routes through the locale-aware Link.
 */
export interface CtaBandAction {
  label: string
  href: string
  variant?: ButtonProps['variant']
}

export function CtaBand({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle: string
  actions: CtaBandAction[]
}) {
  return (
    <Section tone="dark" spacing="default" containerClassName="text-center">
      <SectionHeading tone="inverse" title={title} subtitle={subtitle} />
      <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
        {actions.map((action) => (
          <Button
            key={action.href}
            asChild
            variant={action.variant ?? 'brand-on-dark'}
            size="xl"
          >
            {/^https?:/.test(action.href) ? (
              <a href={action.href}>{action.label}</a>
            ) : (
              <Link href={action.href}>{action.label}</Link>
            )}
          </Button>
        ))}
      </div>
    </Section>
  )
}
