// PROTOTYPE — throwaway. Variant C: utilitarian download table.
// Left-aligned heading, then one bordered list: the detected platform is a
// highlighted "recommended" row with the only big button; every other
// platform is a compact row. Free plugin anchors the list as its own row.
'use client'

import { Download, ArrowRight, Blocks } from 'lucide-react'
import { Section, Container } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import {
  PLATFORMS,
  ORDER,
  type PlatformKey,
} from '@/components/downloads/download-picker'
import { useDetectedPlatform } from './use-detected-platform'

export function HeroVariantC({
  desktopVersion,
  freeVersion,
}: {
  desktopVersion: string | null
  freeVersion: string | null
}) {
  const detected: PlatformKey = useDetectedPlatform()
  const info = PLATFORMS[detected]
  const Icon = info.icon
  const PrimaryIcon = info.kind === 'desktop' ? Download : ArrowRight

  return (
    <Section
      tone="none"
      spacing="hero"
      className="border-b bg-gradient-to-b from-muted/40 to-background"
      bare
    >
      <Container width="content">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Downloads
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Free apps for every device, all in sync
            {desktopVersion ? (
              <>
                {' '}
                — currently{' '}
                <span className="font-medium text-foreground">
                  v{desktopVersion}
                </span>
              </>
            ) : null}
            .
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border bg-card shadow-sm">
          {/* Recommended row */}
          <div className="flex flex-wrap items-center gap-4 border-b bg-muted/40 p-5 sm:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background text-foreground shadow-sm">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold tracking-tight">
                {info.name}
                <span className="ml-2 rounded-full bg-wcpos-red/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-wcpos-red-accent">
                  Recommended for you
                </span>
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {info.short}
              </p>
            </div>
            <Button asChild variant="brand" size="lg">
              <a href={info.href}>
                <PrimaryIcon aria-hidden="true" />
                {info.action}
              </a>
            </Button>
          </div>

          {/* Everything else */}
          <ul className="divide-y">
            {ORDER.filter((key) => key !== detected).map((key) => {
              const p = PLATFORMS[key]
              const RowIcon = p.icon
              return (
                <li
                  key={key}
                  className="flex items-center gap-4 px-5 py-3.5 sm:px-6"
                >
                  <RowIcon
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 hidden text-muted-foreground sm:inline">
                      {p.short}
                    </span>
                  </span>
                  <a
                    href={p.href}
                    className="inline-flex items-center gap-1 text-sm font-medium text-wcpos-red-accent hover:underline"
                  >
                    {p.rowAction}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </li>
              )
            })}
            {/* Free plugin anchor row */}
            <li className="flex items-center gap-4 bg-muted/30 px-5 py-3.5 sm:px-6">
              <Blocks
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className="font-medium">WordPress plugin</span>
                <span className="ml-2 hidden text-muted-foreground sm:inline">
                  The free foundation every app connects to
                  {freeVersion ? ` · v${freeVersion}` : ''}
                </span>
              </span>
              <a
                href="https://wordpress.org/plugins/woocommerce-pos/"
                className="inline-flex items-center gap-1 text-sm font-medium text-wcpos-red-accent hover:underline"
              >
                WordPress.org
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>
      </Container>
    </Section>
  )
}
