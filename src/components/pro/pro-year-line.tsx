import type { ReactNode } from 'react'

interface YearLineStep {
  label: string
  body: string
}

/**
 * How the Yearly license works, drawn as a time line: one payment today, a
 * solid year of updates and priority support, then a dashed "after that"
 * where Pro keeps working. Wide screens draw it across; phones get the same
 * three moments as a vertical line with shorter copy.
 */
export function ProYearLine({
  title,
  today,
  year,
  after,
  short,
  className,
}: {
  title: string
  today: YearLineStep
  year: YearLineStep
  after: YearLineStep
  /** Phone lines, in order: today, the year, after. */
  short: [ReactNode, ReactNode, ReactNode]
  className?: string
}) {
  const label = 'block text-sm font-semibold'
  const body = 'mt-0.5 block max-w-60 text-sm text-muted-foreground'
  const phoneRow = 'relative border-l-2 pb-3 pl-5.5 text-sm text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground'
  const dot = 'absolute -left-[7px] top-1 size-3 rounded-full'

  return (
    <div className={className}>
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>

      <div className="hidden grid-cols-[3fr_2fr] lg:grid">
        <p className="col-start-1 row-start-1 px-4 pb-3 text-center">
          <span className={label}>{year.label}</span>
          <span className={`${body} mx-auto`}>{year.body}</span>
        </p>
        <div
          aria-hidden
          className="col-span-2 row-start-2 grid h-3 grid-cols-[3fr_2fr] items-center"
        >
          <span className="relative h-0.5 bg-muted-foreground">
            <span className="absolute -top-[5px] left-0 size-3 rounded-full bg-wcpos-red ring-[3px] ring-background" />
            <span className="absolute -right-1.5 -top-[5px] size-3 rounded-full border-2 border-muted-foreground bg-background" />
          </span>
          <span className="ml-2.5 border-t-2 border-dashed border-border" />
        </div>
        <p className="col-start-1 row-start-3 pr-4 pt-3.5">
          <span className={label}>{today.label}</span>
          <span className={body}>{today.body}</span>
        </p>
        <p className="col-start-2 row-start-3 -ml-1.5 pt-3.5">
          <span className={label}>{after.label}</span>
          <span className={body}>{after.body}</span>
        </p>
      </div>

      <ol className="ml-[5px] lg:hidden">
        <li className={`${phoneRow} border-muted-foreground`}>
          <span aria-hidden className={`${dot} bg-wcpos-red`} />
          {short[0]}
        </li>
        <li className={`${phoneRow} border-muted-foreground`}>{short[1]}</li>
        <li className={`${phoneRow} border-dashed border-border pb-1`}>
          <span
            aria-hidden
            className={`${dot} border-2 border-muted-foreground bg-background`}
          />
          {short[2]}
        </li>
      </ol>
    </div>
  )
}
