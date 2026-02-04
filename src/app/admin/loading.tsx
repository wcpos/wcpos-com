/**
 * Admin Loading State
 * 
 * This automatically wraps admin pages in a Suspense boundary,
 * allowing dynamic data fetching (Date.now, searchParams, etc.)
 * to work with cacheComponents.
 */
export default function AdminLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
