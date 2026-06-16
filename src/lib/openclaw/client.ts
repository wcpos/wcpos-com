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
  sessionId?: string
  signal?: AbortSignal
}

interface AskAideResult {
  answer: string
  model?: string
}

/** Server-only. Calls the openclaw /execute endpoint as the Aide support agent. */
export async function askAide({
  question,
  sessionId,
  signal,
}: AskAideParams): Promise<AskAideResult> {
  if (!env.OPENCLAW_TOKEN) {
    throw new OpenclawError('support assistant not configured', 503, 'not_configured')
  }

  let response: Response
  try {
    response = await fetch(`${env.OPENCLAW_GATEWAY_URL}/execute`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENCLAW_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: 'aide',
        task_intent: env.OPENCLAW_SUPPORT_INTENT,
        prompt: question,
        session_id: sessionId,
      }),
      signal,
      cache: 'no-store',
    })
  } catch (err) {
    const aborted =
      err instanceof Error && (err.name === 'AbortError' || err.message === 'fetch failed')
    throw new OpenclawError(
      'support assistant unreachable',
      503,
      aborted ? 'timeout' : 'gateway_unreachable'
    )
  }

  const data = (await response.json().catch(() => ({}))) as {
    content?: string
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

  return { answer: (data.content ?? '').trim(), model: data.model }
}
