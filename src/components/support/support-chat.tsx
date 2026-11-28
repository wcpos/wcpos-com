'use client'

import { useState, useRef, useEffect, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  ArrowUpRight,
  CircleAlert,
  LoaderCircle,
  MessageCircleQuestionMark,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { useTurnstileGate } from '@/components/auth/use-turnstile-gate'
import { trackClientEvent } from '@/lib/analytics/client-events'
import { useLocale, useTranslations } from 'next-intl'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Container, Section } from '@/components/ui/section'
import { Markdown } from '@/components/ui/markdown'
import { TextLink } from '@/components/ui/text-link'
import { DiscordSection, OUTLINE_ON_SURFACE } from '@/components/support/discord-section'
import { SupportGuides } from '@/components/support/support-guides'
import { DISCORD_INVITE_URL } from '@/lib/discord-invite'
import { cn } from '@/lib/utils'
import styles from './support-chat.module.css'

type Vote = 'up' | 'down'

interface Message {
  role: 'user' | 'assistant'
  content: string
  /** Desk-issued id; only answers that carry one can be voted on. */
  answerId?: string
  vote?: Vote
  /** false: Aide could not answer from the docs, so the reply hands over to a person. */
  answered?: boolean
  /** Wiki page paths Aide cited (ADR 0008 amendment). */
  sources?: string[]
}

type SupportErrorCode =
  | 'invalid_question'
  | 'bot_check_failed'
  | 'rate_limited'
  | 'budget_exhausted'
  | 'empty_answer'
  | 'gateway_busy'
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
  'gateway_busy',
  'gateway_rate_limited',
  'timeout',
  'unavailable',
])
const STATUS_URL = 'https://status.wcpos.com/'
const SUPPORT_EMAIL = 'mailto:support@wcpos.com'
// Links inside a sentence are underlined; standalone links are not (TextLink).
const IN_SENTENCE_LINK = 'underline underline-offset-2'
const AVATAR =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wcpos-red/10 text-xs font-medium text-wcpos-red-accent'

function isSupportErrorCode(value: unknown): value is SupportErrorCode {
  return typeof value === 'string' && SUPPORT_ERROR_CODES.has(value as SupportErrorCode)
}

/**
 * Aide cites wiki page paths (support/licensing/activation.md). The wiki is
 * private, so a source is named from its path rather than linked.
 */
export function sourceTitle(path: string) {
  const parts = path
    .replace(/\.md$/, '')
    .split('/')
    .filter((p, i) => p && !(i === 0 && p === 'support') && p !== 'index' && p !== '_index')
  if (parts.length === 0) return path
  return parts
    .map((p) => {
      const words = p.replace(/[-_]+/g, ' ')
      return words.charAt(0).toUpperCase() + words.slice(1)
    })
    .join(' › ')
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
  const tDiscord = useTranslations('support.discord')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'asking'>('idle')
  const [error, setError] = useState<SupportErrorCode | 'network' | null>(null)
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
    // A failed request keeps the question: it goes back into the box and
    // leaves the thread, so pressing Ask again retries it.
    const fail = (code: SupportErrorCode | 'network') => {
      setError(code)
      setMessages((m) => m.slice(0, -1))
      setInput(question)
    }
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
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        fail(
          isSupportErrorCode(data?.errorCode)
            ? data.errorCode
            : res.status === 504
              ? 'timeout'
              : 'unavailable'
        )
        return
      }
      if (typeof data?.answer !== 'string' || data.answer.trim() === '') {
        fail('empty_answer')
        return
      }
      if (typeof data.sessionId === 'string' && data.sessionId !== '') {
        sessionIdRef.current = data.sessionId
        sessionStorage.setItem('wcpos-support-session', data.sessionId)
      }
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: data.answer,
          answerId: typeof data.answerId === 'string' ? data.answerId : undefined,
          answered: data.answered !== false,
          sources: Array.isArray(data.sources)
            ? [...new Set<string>(data.sources.filter((s: unknown) => typeof s === 'string'))]
            : [],
        },
      ])
    } catch {
      fail('network')
    } finally {
      // Tokens are single-use; the server spends one whenever the bot check passes.
      // Every attempt (answer, error or network failure) re-runs the widget so
      // the next attempt carries a fresh token.
      turnstile.reset()
      setStatus('idle')
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void ask(input)
  }

  function feedback(helpful: boolean, idx: number) {
    const message = messages[idx]
    if (!message?.answerId || message.vote) return
    const vote: Vote = helpful ? 'up' : 'down'
    // Record the vote locally first so both buttons lock before the request
    // goes out: one vote per answer, whatever the desk replies.
    setMessages((m) => m.map((msg, i) => (i === idx ? { ...msg, vote } : msg)))
    // Recorder seam: consent-gated, reads window.posthog at capture time
    // (set by initPostHogBrowser), never throws — and keeps the posthog-js
    // SDK out of this route's pre-consent bundle.
    trackClientEvent('support_answer_feedback', { helpful, turn: idx })
    // Best effort: a vote that fails to reach the desk is not worth
    // interrupting the visitor over.
    void fetch('/api/support/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answerId: message.answerId,
        sessionId: sessionIdRef.current,
        vote,
        locale,
      }),
    }).catch(() => {})
  }

  // When this host renders a Turnstile widget, hold submissions until it has
  // issued a token — otherwise the first eager click posts an empty token and
  // gets a confusing 403 from the bot check. If the gate fails (blocked
  // script, unsupported browser, widget error), it stops verifying so the
  // form re-enables and the server's fail-closed check becomes the arbiter.
  const { verifying } = turnstile
  const started = messages.length > 0
  const last = messages.at(-1)
  const answeredLast = status === 'idle' && last?.role === 'assistant' && last.answered !== false
  const strong = (chunks: ReactNode) => (
    <strong className="font-semibold text-foreground">{chunks}</strong>
  )
  const emailLink = (chunks: ReactNode) => (
    <TextLink href={SUPPORT_EMAIL} className={IN_SENTENCE_LINK}>
      {chunks}
    </TextLink>
  )
  const discordAnchor = (chunks: ReactNode) => (
    <TextLink href="#discord" className={IN_SENTENCE_LINK}>
      {chunks}
    </TextLink>
  )

  const voteButton = (m: Message, i: number, up: boolean) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={t(up ? 'feedback.yes' : 'feedback.no')}
      aria-pressed={m.vote === (up ? 'up' : 'down')}
      disabled={m.vote !== undefined}
      onClick={() => feedback(up, i)}
      className={cn(
        'size-7 p-0 text-muted-foreground [&_svg]:size-3.5',
        OUTLINE_ON_SURFACE,
        m.vote === (up ? 'up' : 'down') && 'bg-muted hover:bg-muted disabled:opacity-100'
      )}
    >
      {up ? <ThumbsUp aria-hidden="true" /> : <ThumbsDown aria-hidden="true" />}
    </Button>
  )

  const answerRow = (head: ReactNode, body: ReactNode, key?: number) => (
    <div key={key} className="md:grid md:grid-cols-[2rem_minmax(0,1fr)] md:gap-x-3.5">
      <div className="flex items-center gap-2.5 md:contents">
        <div aria-hidden="true" className={AVATAR}>
          Ai
        </div>
        <div className="min-w-0 text-[13px] leading-8 text-muted-foreground">{head}</div>
      </div>
      <div className="mt-1 min-w-0 md:col-start-2">{body}</div>
    </div>
  )

  return (
    <div className="w-full">
      {!started && (
        <div>
          <h1 className="text-balance text-4xl max-[375px]:text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">{t('hero.title')}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {t('hero.subtitle')}
          </p>
        </div>
      )}

      {started && (
        <div className="flex flex-col gap-5.5">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div
                key={i}
                className="max-w-[85%] self-end rounded-md bg-muted px-3.5 py-2 text-[15px] text-foreground"
              >
                {m.content}
              </div>
            ) : (
              answerRow(
                t.rich(m.answered === false ? 'bylineHandoff' : 'byline', { strong }),
                <>
                  <Markdown
                    content={m.content}
                    untrusted
                    className="text-[15px] text-foreground [&>*+*]:mt-3 [&_a]:text-wcpos-red-accent [&_code]:font-mono [&_code]:text-[13px]"
                  />
                  {m.answered === false && (
                    <Alert
                      tone="neutral"
                      className="mt-3.5 text-foreground"
                      icon={<MessageCircleQuestionMark className="text-muted-foreground" />}
                      title={t('handoff.title')}
                    >
                      <p>{t.rich('handoff.body', { email: emailLink })}</p>
                      <div className="pt-2">
                        <Button asChild variant="outline" className={OUTLINE_ON_SURFACE}>
                          <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">
                            {tDiscord('open')}
                            <ArrowUpRight aria-hidden="true" />
                          </a>
                        </Button>
                      </div>
                    </Alert>
                  )}
                  {m.answered !== false && m.sources && m.sources.length > 0 && (
                    <div className="mt-4.5">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        {t('sources.title')}
                      </p>
                      <ol className="border-b border-border">
                        {m.sources.map((source, n) => (
                          <li
                            key={source}
                            className="flex items-center gap-2.5 border-t border-border py-2 text-sm"
                          >
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-muted px-1 text-xs font-semibold tabular-nums text-foreground">
                              {n + 1}
                            </span>
                            <span className="min-w-0 font-medium text-foreground">{sourceTitle(source)}</span>
                            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                              {t('sources.wiki')}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {m.answerId && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{t('feedback.prompt')}</span>
                      {voteButton(m, i, true)}
                      {voteButton(m, i, false)}
                    </div>
                  )}
                </>,
                i
              )
            )
          )}
          {status === 'asking' && (
            <div role="status" aria-live="polite">
              {answerRow(
                t.rich('byline', { strong }),
                <p className={`text-[13px] ${styles.thinkingText}`}>{t('thinking')}</p>
              )}
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className={cn(
          'flex min-h-13 items-center gap-2 rounded-md border border-input bg-card p-1.5 pl-4 shadow-xs transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
          started ? 'mt-7' : 'mt-6 lg:mt-8'
        )}
      >
        <input
          aria-label={t('form.label')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={started ? t('form.followUpPlaceholder') : t('form.placeholder')}
          maxLength={1000}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          disabled={status === 'asking' || !input.trim() || verifying}
        >
          {status === 'asking' ? (
            <>
              <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
              <span className="sr-only">{t('form.submit')}</span>
            </>
          ) : (
            t('form.submit')
          )}
        </Button>
      </form>

      {started && (
        <p className="mt-2 text-xs text-muted-foreground">{t('form.followUpNote')}</p>
      )}

      {verifying && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {t(turnstile.interacting ? 'form.interactive' : 'form.verifying')}
        </p>
      )}

      <div
        data-testid="support-turnstile"
        className={turnstile.interacting ? 'mt-3 flex' : undefined}
      >
        {turnstile.widget}
      </div>

      {error && (
        <Alert
          tone={null}
          className="mt-3 bg-wcpos-red/10 text-wcpos-red-accent"
          icon={<CircleAlert />}
          title={error === 'network' ? tErrors('networkTitle') : undefined}
        >
          {error === 'network' ? (
            <>
              <p>{tErrors('network')}</p>
              <p>
                {tErrors.rich('networkHint', {
                  status: (chunks) => (
                    <TextLink href={STATUS_URL} className={IN_SENTENCE_LINK}>
                      {chunks}
                    </TextLink>
                  ),
                  discord: discordAnchor,
                })}
              </p>
            </>
          ) : (
            <p>
              {tErrors(error)}{' '}
              <a href="#discord" className={IN_SENTENCE_LINK}>
                {t('discordLink')}
              </a>
            </p>
          )}
        </Alert>
      )}

      {turnstile.failed && (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          {t('turnstileTrouble')}{' '}
          <a href="#discord" className="underline">
            {t('discordLink')}
          </a>
        </p>
      )}

      {answeredLast && (
        <p className="mt-3.5 text-sm text-muted-foreground">
          {t.rich('stuck', { discord: discordAnchor, email: emailLink })}
        </p>
      )}

      {!started && (
        <div className="mt-7">
          <p className="mb-1.5 text-[13px] font-medium text-muted-foreground">{t('examplesLabel')}</p>
          <ul className="border-t border-border">
            {EXAMPLES.map((q) => (
              <li key={q} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => void ask(t(`examples.${q}`))}
                  disabled={verifying}
                  className="group inline-flex w-full items-center gap-3 rounded-sm px-0.5 py-2.75 text-left text-[15px] text-foreground transition-colors hover:text-wcpos-red-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  <MessageCircleQuestionMark aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">{t(`examples.${q}`)}</span>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground opacity-60" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className={cn('text-xs text-muted-foreground', started ? 'mt-4' : 'mt-3 lg:mt-4')}>
        {t('poweredBy')}
      </p>

      {/* Phone only: the person panel is not beside the field there. */}
      {!started && (
        <p className="mt-2 text-[13px] text-muted-foreground lg:hidden">
          <TextLink href="#discord">{t('route.discord')}</TextLink>
          <span aria-hidden="true"> · </span>
          <TextLink href={SUPPORT_EMAIL}>{t('route.email')}</TextLink>
        </p>
      )}
    </div>
  )
}

/**
 * Two lanes from lg up: Aide (and the guides) on the left, a person on the
 * right, sticky under the header. Below lg the lanes dissolve into one column:
 * Ask box, person card, guides, then the live widget.
 */
function SupportLanes({ guides }: { guides: boolean }) {
  return (
    <Container
      width="content"
      className="flex max-w-6xl flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-x-18"
    >
      <div className="min-w-0 max-lg:order-1 lg:col-start-1 lg:row-start-1">
        <SupportChat />
      </div>
      <DiscordSection className="lg:col-start-2 lg:row-span-2 lg:row-start-1" />
      {guides && (
        <SupportGuides className="mt-12 max-lg:order-3 lg:col-start-1 lg:row-start-2 lg:mt-18" />
      )}
    </Container>
  )
}

export function SupportDefaultContent() {
  return (
    <Section tone="none" spacing="none" bare className="bg-background pt-8 pb-16 lg:pt-14 lg:pb-24">
      <SupportLanes guides />
    </Section>
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
          <h1 className="mb-3 text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
            {t('title')}
          </h1>
          <p className="text-base text-muted-foreground">
            {t.rich('body', {
              ref: () => <span className="font-mono font-medium">{supportRef}</span>,
            })}
          </p>
        </div>
      </Section>
      <Section tone="none" spacing="none" bare className="bg-background pb-16 lg:pb-24">
        <SupportLanes guides={false} />
      </Section>
    </>
  )
}
