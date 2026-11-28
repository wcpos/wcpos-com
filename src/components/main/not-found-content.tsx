'use client'

import { useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, BookOpen, Download, LifeBuoy, Store } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { TextLink } from '@/components/ui/text-link'
import { ExternalMark } from '@/components/main/shell-parts'
import { cn } from '@/lib/utils'

const DOCS_URL = 'https://docs.wcpos.com'

const subscribeNever = () => () => {}

function readAddress() {
  const { host, pathname } = window.location
  try {
    return `${host}${decodeURI(pathname)}`
  } catch {
    return `${host}${pathname}`
  }
}

/**
 * The 404 body: the localized title, what to check, the address the visitor
 * asked for, then the ways out — side by side from lg, stacked rows below,
 * with "Go to homepage" under the address on phones.
 *
 * Client component so that next-intl's Link resolves the locale from
 * NextIntlClientProvider context instead of request headers. The address is
 * read in the browser after hydration (the server has none to match).
 */
export function NotFoundContent() {
  const t = useTranslations('errors')
  const tHeader = useTranslations('header')
  const address = useSyncExternalStore(subscribeNever, readAddress, () => null)

  const ways = [
    {
      href: '/downloads',
      Icon: Download,
      name: tHeader('downloads'),
      line: t('notFoundDownloadsLine'),
    },
    {
      href: '/pro',
      Icon: Store,
      name: 'WCPOS Pro',
      line: t('notFoundProLine'),
    },
    {
      href: DOCS_URL,
      Icon: BookOpen,
      name: tHeader('documentation'),
      line: t('notFoundDocsLine'),
      external: true,
    },
    {
      href: '/support',
      Icon: LifeBuoy,
      name: tHeader('support'),
      line: t('notFoundSupportLine'),
    },
  ]

  return (
    <main className="flex-1 px-4 pb-14 pt-10 lg:pb-24 lg:pt-20">
      <title>{`${t('notFoundTitle')} | WCPOS`}</title>
      <div className="mx-auto flex max-w-[1088px] flex-col">
        <div className="max-w-[680px]">
          <h1 className="text-[34px] font-bold leading-[1.05] tracking-tight lg:text-5xl">
            {t('notFoundTitle')}
          </h1>
          <p className="mt-3 text-base text-muted-foreground lg:mt-3.5 lg:text-lg">
            {t('notFoundDescription')}
          </p>
          {/* Held in place before hydration so nothing below jumps. */}
          <p
            className={cn(
              'mt-3.5 flex flex-col items-start gap-1.5 text-[13px] text-muted-foreground lg:flex-row lg:items-baseline lg:gap-2.5',
              !address && 'invisible'
            )}
          >
            <span>{t('notFoundAskedFor')}</span>
            <code className="max-w-full rounded-sm bg-muted px-2 py-0.5 font-mono text-[13px] leading-relaxed text-foreground [overflow-wrap:anywhere]">
              {address ?? ' '}
            </code>
          </p>
        </div>

        <TextLink
          asChild
          className="mt-8 inline-flex items-center gap-2 self-start text-sm lg:order-last lg:mt-10"
        >
          <Link href="/">
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t('goHome')}
          </Link>
        </TextLink>

        <ul className="mt-6 grid border-t lg:mt-14 lg:grid-cols-4">
          {ways.map(({ href, Icon, name, line, external }) => {
            const body = (
              <>
                <Icon
                  aria-hidden="true"
                  className="row-span-2 mt-0.5 size-5 text-muted-foreground"
                />
                <span className="text-[17px] font-semibold underline-offset-4 group-hover:underline">
                  {name}
                  {external && (
                    <ExternalMark className="ml-0 size-5 align-[-5px]" />
                  )}
                </span>
                <span className="text-sm text-muted-foreground">{line}</span>
              </>
            )
            const linkClass =
              'group grid grid-cols-[24px_1fr] gap-x-3 gap-y-0.5 py-4 lg:flex lg:h-full lg:flex-col lg:gap-2 lg:px-6 lg:pb-2 lg:pt-6'
            return (
              <li
                key={href}
                className="border-b lg:border-b-0 lg:border-l lg:first:border-l-0 lg:[&:first-child>a]:pl-0"
              >
                {external ? (
                  <a href={href} className={linkClass}>
                    {body}
                  </a>
                ) : (
                  <Link href={href} className={linkClass}>
                    {body}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
