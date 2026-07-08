import { env } from '@/utils/env'

export class OpenclawError extends Error {
  status: number
  code: string
  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'OpenclawError'
    this.status = status
    this.code = code
  }
}

interface AskAideParams {
  question: string
  locale?: string
  sessionId?: string
  signal?: AbortSignal
}

interface AskAideResult {
  answer: string
  model?: string
  /** False when the answerer escalated to Discord; `answer` carries the hand-off message. */
  answered: boolean
  sources: string[]
}

/** Server-only. Calls the openclaw /support/answer endpoint (grounded support answerer). */
export async function askAide({
  question,
  locale,
  sessionId,
  signal,
}: AskAideParams): Promise<AskAideResult> {
  if (!env.OPENCLAW_TOKEN) {
    throw new OpenclawError('support assistant not configured', 503, 'not_configured')
  }

  let response: Response
  try {
    response = await fetch(`${env.OPENCLAW_GATEWAY_URL}/support/answer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENCLAW_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        locale,
        session_id: sessionId,
        channel: 'web',
      }),
      signal,
      cache: 'no-store',
    })
  } catch (err) {
    // Only a real abort (our timeout controller) is a "timeout"; every other
    // failure (DNS, connection refused, generic 'fetch failed') is unreachable.
    const aborted = err instanceof Error && err.name === 'AbortError'
    throw new OpenclawError(
      'support assistant unreachable',
      503,
      aborted ? 'timeout' : 'gateway_unreachable'
    )
  }

  const data = (await response.json().catch(() => ({}))) as {
    answer?: string
    answered?: boolean
    sources?: string[]
    model?: string
    error?: { code?: string; message?: string }
  }

  if (!response.ok) {
    throw new OpenclawError(
      data.error?.message ?? 'support assistant error',
      response.status,
      data.error?.code ?? 'runtime_error'
    )
  }

  return {
    answer: (data.answer ?? '').trim(),
    model: data.model,
    answered: data.answered === true,
    sources: Array.isArray(data.sources) ? data.sources.filter((s) => typeof s === 'string') : [],
  }
}
