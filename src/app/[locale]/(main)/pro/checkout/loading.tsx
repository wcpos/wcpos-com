export default function CheckoutLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="mx-auto mb-8 h-9 w-40 animate-pulse rounded bg-muted" />
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {[1, 2].map((panel) => (
            <div
              key={panel}
              className="space-y-3 rounded-xl border bg-card p-6"
            >
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
              <div className="h-20 animate-pulse rounded bg-muted" />
              <div className="h-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
