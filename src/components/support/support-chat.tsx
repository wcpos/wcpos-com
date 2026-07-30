'use client'

import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTurnstileGate } from '@/components/auth/use-turnstile-gate'
import { trackClientEvent } from '@/lib/analytics/client-events'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/ui/markdown'
import { Section } from '@/components/ui/section'
import { DiscordSection } from '@/components/support/discord-section'
import styles from './support-chat.module.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type SupportErrorCode =
  | 'invalid_question'
  | 'bot_check_failed'
  | 'rate_limited'
  | 'budget_exhausted'
  | 'empty_answer'
  | 'gateway_rate_limited'
  | 'timeout'
  | 'unavailable'

const EXAMPLES = ['e1', 'e2', 'e3'] as const
const SUPPORT_ERROR_CODES = new Set<SupportErrorCode>([
  'invalid_question',
  'bot_check_failed',
  'rate_limited',
  'budget_exhausted',
  'empty_answer',
  'gateway_rate_limited',
  'timeout',
  'unavailable',
])

function isSupportErrorCode(value: unknown): value is SupportErrorCode {
  return typeof value === 'string' && SUPPORT_ERROR_CODES.has(value as SupportErrorCode)
}

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
  const locale = useLocale()
  const t = useTranslations('support.chat')
  const tErrors = useTranslations('support.errors')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'asking'>('idle')
  const [error, setError] = useState<string | null>(null)
  const turnstile = useTurnstileGate()
  const sessionIdRef = useSessionId()

  // Gate failures are recorded by useTurnstileGate itself
  // (turnstile_gate_failed, with a reason) — this replaced the page-local
  // support_turnstile_error event so all Turnstile surfaces count uniformly.

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
          locale,
          sessionId: sessionIdRef.current || undefined,
          turnstileToken: turnstile.token ?? '',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        // A failed bot check usually means the token went stale (single-use,
        // ~5 min validity) — reset the widget so the next attempt carries a
        // fresh one instead of failing forever.
        if (data.errorCode === 'bot_check_failed') {
          turnstile.reset()
        }
        setError(
          isSupportErrorCode(data.errorCode)
            ? tErrors(data.errorCode)
            : tErrors('unknown')
        )
        return
      }
      if (data.sessionId) {
        sessionIdRef.current = data.sessionId
        sessionStorage.setItem('wcpos-support-session', data.sessionId)
      }
      setMessages((m) => [...m, { role: 'assistant', content: data.answer }])
      // Tokens are single-use — re-run the widget so a follow-up question
      // carries a fresh one.
      turnstile.reset()
    } catch {
      setError(tErrors('network'))
    } finally {
      setStatus('idle')
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void ask(input)
  }

  function feedback(helpful: boolean, idx: number) {
    // Recorder seam: consent-gated, reads window.posthog at capture time
    // (set by initPostHogBrowser), never throws — and keeps the posthog-js
    // SDK out of this route's pre-consent bundle.
    trackClientEvent('support_answer_feedback', { helpful, turn: idx })
  }

  // When this host renders a Turnstile widget, hold submissions until it has
  // issued a token — otherwise the first eager click posts an empty token and
  // gets a confusing 403 from the bot check. If the gate fails (blocked
  // script, unsupported browser, widget error), it stops verifying so the
  // form re-enables and the server's fail-closed check becomes the arbiter.
  const { verifying } = turnstile
  const started = messages.length > 0

  return (
    <div className="mx-auto w-full max-w-2xl">
      {!started && (
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">{t('hero.title')}</h1>
          <p className="mb-6 text-base text-muted-foreground">
            {t('hero.subtitle')}
          </p>
        </div>
      )}

      {started && (
        <div className="mb-4 space-y-4">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] rounded-md bg-wcpos-red px-3.5 py-2 text-sm text-white">
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
                    <span className="text-xs">{t('feedback.prompt')}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={t('feedback.yes')}
                      onClick={() => feedback(true, i)}
                      className="h-auto px-2 py-1 text-xs hover:bg-muted"
                    >
                      👍
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={t('feedback.no')}
                      onClick={() => feedback(false, i)}
                      className="h-auto px-2 py-1 text-xs hover:bg-muted"
                    >
                      👎
                    </Button>
                  </div>
                </div>
              </div>
            )
          )}
          {status === 'asking' && (
            <div className="flex gap-3" role="status" aria-live="polite">
              <div
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wcpos-red/10 text-xs font-medium text-wcpos-red-accent"
              >
                Ai
              </div>
              <p className={`self-center text-sm ${styles.thinkingText}`}>
                {t('thinking')}
              </p>
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-md border-2 border-wcpos-red/40 bg-card p-1.5 pl-4 focus-within:border-wcpos-red"
      >
        <input
          aria-label={t('form.label')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={started ? t('form.followUpPlaceholder') : t('form.placeholder')}
          maxLength={1000}
          className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          disabled={status === 'asking' || !input.trim() || verifying}
        >
          {status === 'asking' ? '…' : t('form.submit')}
        </Button>
      </form>

      {error && (
        <p className="mt-2 text-sm text-destructive">
          {error}{' '}
          <a href="#discord" className="underline">
            {t('discordLink')}
          </a>
        </p>
      )}

      {turnstile.failed && (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          {t('turnstileTrouble')}{' '}
          <a href="#discord" className="underline">
            {t('discordLink')}
          </a>
        </p>
      )}

      {!started && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((q) => (
            <Button
              key={q}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void ask(t(`examples.${q}`))}
              disabled={verifying}
              className="h-auto rounded-full bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            >
              {t(`examples.${q}`)}
            </Button>
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {t('poweredBy')}
      </p>

      {turnstile.widget}
    </div>
  )
}

export function SupportDefaultContent() {
  return (
    <>
      <Section spacing="hero">
        <SupportChat />
      </Section>
      <DiscordSection />
    </>
  )
}

export function SupportPageContent() {
  const t = useTranslations('support.order')
  const searchParams = useSearchParams()
  const supportRef = searchParams.get('ref')?.trim()

  if (!supportRef) {
    return <SupportDefaultContent />
  }

  return (
    <>
      <Section spacing="compact">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
            {t('title')}
          </h1>
          <p className="text-base text-muted-foreground">
            {t.rich('body', {
              ref: () => <span className="font-mono font-medium">{supportRef}</span>,
            })}
          </p>
        </div>
      </Section>
      <Section spacing="default" className="pt-0">
        <SupportChat />
      </Section>
      <DiscordSection />
    </>
  )
}
