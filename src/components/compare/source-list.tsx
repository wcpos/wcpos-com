export function SourceList({
  items,
}: {
  items: { key: string; label: string; url: string }[]
}) {
  return (
    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
      {items.map(({ key, label, url }) => (
        <li key={key}>
          <a href={url} rel="nofollow noreferrer" className="font-medium text-foreground underline underline-offset-4">
            {label}
          </a>{' '}
          <span className="whitespace-nowrap">({new URL(url).hostname.replace(/^www\./, '')})</span>
        </li>
      ))}
    </ul>
  )
}
