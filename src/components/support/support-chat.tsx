'use client'

import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import posthog from 'posthog-js'
import { Markdown } from '@/components/ui/markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const EXAMPLES = [
  'Why is my licence inactive?',
  'Which barcode scanners are supported?',
  'How do I sync products from WooCommerce?',
]

function useSessionId() {
  const ref = useRef<string>('')
  useEffect(() => {
    const existing = sessionStorage.getItem('wcpos-support-session')
    if (existing) {
      ref.current = existing
      return
    }
    const id = crypto.randomUUID()
    sessionStorage.setItem('wcpos-support-session', id)
    ref.current = id
  }, [])
  return ref
}

export function SupportChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'asking'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const sessionIdRef = useSessionId()
  const turnstileRef = useRef<TurnstileInstance | null>(null)

  async function ask(question: string) {
    if (!question.trim() || status === 'asking') return
    setError(null)
    setMessages((m) => [...m, { role: 'user', content: question }])
    setInput('')
    setStatus('asking')
    try {
      const res = await fetch('/api/support/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          sessionId: sessionIdRef.current || undefined,
          turnstileToken: token ?? '',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }
      if (data.sessionId) {
        sessionIdRef.current = data.sessionId
        sessionStorage.setItem('wcpos-support-session', data.sessionId)
      }
      setMessages((m) => [...m, { role: 'assistant', content: data.answer }])
      setToken(null)
      turnstileRef.current?.reset()
    } catch {
      setError('The assistant is unavailable right now. Please ask in Discord.')
    } finally {
      setStatus('idle')
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void ask(input)
  }

  function feedback(helpful: boolean, idx: number) {
    try {
      posthog.capture('support_answer_feedback', { helpful, turn: idx })
    } catch {
      /* best-effort */
    }
  }

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  // When a Turnstile site key is configured, hold submissions until the invisible
  // widget has issued a token — otherwise the first eager click posts an empty
  // token and gets a confusing 403 from the bot check.
  const verifying = Boolean(siteKey) && !token
  const started = messages.length > 0

  return (
    <div className="mx-auto w-full max-w-2xl">
      {!started && (
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">How can we help?</h1>
          <p className="mb-6 text-base text-muted-foreground">
            Ask anything about WCPOS — setup, licensing, hardware, syncing, printing. You&apos;ll get
            an instant answer drawn from our docs.
          </p>
        </div>
      )}

      {started && (
        <div className="mb-4 space-y-4">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] rounded-lg bg-wcpos-red px-3.5 py-2 text-sm text-white">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wcpos-red/10 text-xs font-medium text-wcpos-red-accent">
                  Ai
                </div>
                <div className="flex-1">
                  <Markdown content={m.content} className="text-sm text-foreground" />
                  <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs">Was this helpful?</span>
                    <button
                      aria-label="Yes"
                      onClick={() => feedback(true, i)}
                      className="rounded border px-2 py-1 text-xs hover:bg-muted"
                    >
                      👍
                    </button>
                    <button
                      aria-label="No"
                      onClick={() => feedback(false, i)}
                      className="rounded border px-2 py-1 text-xs hover:bg-muted"
                    >
                      👎
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
          {status === 'asking' && (
            <p className="pl-11 text-sm text-muted-foreground">Aide is thinking…</p>
          )}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-xl border-2 border-wcpos-red/40 bg-card p-1.5 pl-4 focus-within:border-wcpos-red"
      >
        <input
          aria-label="Ask a support question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={started ? 'Ask a follow-up…' : 'e.g. How do I connect a receipt printer?'}
          maxLength={1000}
          className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={status === 'asking' || !input.trim() || verifying}
          className="rounded-lg bg-wcpos-red px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {status === 'asking' ? '…' : 'Ask'}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-sm text-destructive">
          {error}{' '}
          <a href="#discord" className="underline">
            Ask in Discord →
          </a>
        </p>
      )}

      {!started && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((q) => (
            <button
              key={q}
              onClick={() => void ask(q)}
              disabled={verifying}
              className="rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Answered by Aide · trained on the WCPOS docs &amp; wiki
      </p>

      {siteKey && (
        <Turnstile
          ref={turnstileRef}
          siteKey={siteKey}
          onSuccess={setToken}
          options={{ size: 'invisible' }}
        />
      )}
    </div>
  )
}
