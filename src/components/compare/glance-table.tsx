import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface GlanceTableRow {
  label: string
  wcpos: string
  other: string
}

/**
 * The "at a glance" comparison table shared by the /compare/* vendor pages.
 *
 * Phone layout: below `sm` the table becomes a flex column, the header and
 * body become blocks, and each row becomes a two-column grid, so a row's label
 * spans the full width above its two answers instead of squeezing three ~110px
 * columns. The empty corner cell (or the feature header) is hidden there, and
 * the caption moves last, full width, below the body. The header row is
 * `sr-only` there (assistive tech still reads it); instead each answer gets an
 * `aria-hidden` product-name label above it. From `sm` up every
 * `max-sm:` class is inert and the table renders as a normal three-column
 * table. The DOM stays a real <table> with scoped headers either way.
 */
export function GlanceTable({
  wcposHeader,
  otherHeader,
  featureHeader,
  rows,
  caption,
}: {
  wcposHeader: string
  otherHeader: string
  featureHeader?: string
  rows: GlanceTableRow[]
  caption?: string
}) {
  return (
    <Table className="max-sm:flex max-sm:flex-col">
      {caption && (
        <TableCaption className="max-sm:order-last max-sm:mt-4 max-sm:w-full">
          {caption}
        </TableCaption>
      )}
      <TableHeader className="max-sm:block">
        <TableRow className="max-sm:sr-only max-sm:grid max-sm:grid-cols-2">
          {featureHeader === undefined ? (
            <td className="max-sm:hidden" />
          ) : (
            <TableHead scope="col" className="max-sm:hidden">
              {featureHeader}
            </TableHead>
          )}
          <TableHead scope="col">{wcposHeader}</TableHead>
          <TableHead scope="col">{otherHeader}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="max-sm:block">
        {rows.map((row) => (
          <TableRow key={row.label} className="max-sm:grid max-sm:grid-cols-2">
            <th
              scope="row"
              className="p-2 text-left align-middle font-medium max-sm:col-span-2 max-sm:pb-0"
            >
              {row.label}
            </th>
            <TableCell>
              <span aria-hidden="true" className="mb-1 block text-xs font-medium text-muted-foreground sm:hidden">
                {wcposHeader}
              </span>
              {row.wcpos}
            </TableCell>
            <TableCell>
              <span aria-hidden="true" className="mb-1 block text-xs font-medium text-muted-foreground sm:hidden">
                {otherHeader}
              </span>
              {row.other}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
