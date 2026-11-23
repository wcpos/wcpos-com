import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

/** Real customer quote — public wordpress.org review, linked below. */
export function ReviewQuote({ className }: { className?: string }) {
  const t = useTranslations('home.trust')

  return (
    <figure className={cn('mx-auto max-w-2xl text-center', className)}>
      <blockquote className="mb-4 text-lg italic leading-relaxed text-slate-700 dark:text-slate-300">
        &ldquo;{t('quote')}&rdquo;
      </blockquote>
      <figcaption className="text-sm text-slate-500 dark:text-slate-400">
        —{' '}
        <a
          href="https://wordpress.org/support/topic/does-what-it-says-836/"
          className="underline underline-offset-4 hover:text-slate-700 dark:hover:text-slate-300"
          rel="noopener"
        >
          {t('attribution')}
        </a>
      </figcaption>
    </figure>
  )
}
