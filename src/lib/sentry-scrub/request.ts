// The RequestData integration attaches body, cookies, query string and headers even with
// sendDefaultPii off (@sentry/core 10.78), so keep only url, method and User-Agent.
type RequestLike = { url?: string; method?: string; headers?: Record<string, string> }

export function stripRequest<T extends { request?: RequestLike }>(event: T): T {
  const request = event.request
  if (!request) return event
  const headers = request.headers ?? {}
  const userAgentKey = Object.keys(headers).find((key) => key.toLowerCase() === 'user-agent')
  event.request = {
    ...('url' in request && { url: request.url }),
    ...('method' in request && { method: request.method }),
    ...(userAgentKey && { headers: { 'User-Agent': headers[userAgentKey] } }),
  }
  return event
}
