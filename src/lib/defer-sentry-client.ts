export type SentryCapture = { captureException: (error: unknown) => unknown }

export function deferSentryClient(
  load: () => Promise<SentryCapture>,
  win: Window = window
): void {
  const queue: unknown[] = []
  const onError = (event: ErrorEvent) => queue.push(event.error ?? event.message)
  const onRejection = (event: PromiseRejectionEvent) => queue.push(event.reason)
  win.addEventListener('error', onError)
  win.addEventListener('unhandledrejection', onRejection)

  function start() {
    void load().then(
      (sentry) => {
        win.removeEventListener('error', onError)
        win.removeEventListener('unhandledrejection', onRejection)
        for (const item of queue) sentry.captureException(item)
        queue.length = 0
      },
      () => {
        win.removeEventListener('error', onError)
        win.removeEventListener('unhandledrejection', onRejection)
        queue.length = 0
      }
    )
  }

  function schedule() {
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(start, { timeout: 2000 })
    } else {
      win.setTimeout(start, 0)
    }
  }

  if (win.document.readyState === 'complete') schedule()
  else win.addEventListener('load', schedule, { once: true })
}
