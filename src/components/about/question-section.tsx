import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

/**
 * One of the About page's three questions (who builds it, how long it has
 * been going, how it is paid for): the question and a one-line lead in a
 * 320px column, the answer beside it. Stacks below lg.
 */
export function QuestionSection({
  id,
  tone,
  title,
  lead,
  aside,
  children,
}: {
  id: string
  tone: 'default' | 'muted'
  title: string
  lead: string
  /** Extra content under the lead in the question column (desktop only). */
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Section id={id} tone={tone} spacing="default">
      <div className="grid items-start gap-7 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-18">
        <div>
          <SectionHeading align="left" title={title} />
          <p className="mt-3 leading-relaxed text-muted-foreground">{lead}</p>
          {aside}
        </div>
        {children}
      </div>
    </Section>
  )
}
