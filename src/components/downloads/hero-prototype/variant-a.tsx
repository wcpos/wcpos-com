// PROTOTYPE — throwaway. Variant A: Craft-style centered stack.
// Big detected-platform CTA, then two grouped cards (Desktop / Mobile & Web)
// with pill actions per row. Free plugin is a caption link under the CTA.
'use client'

import {
  Laptop,
  Smartphone,
  Globe,
  Tablet,
  Download,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { Section } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { PLATFORMS } from '@/components/downloads/download-picker'
import { useDetectedPlatform } from './use-detected-platform'
import { cn } from '@/lib/utils'

function Pill({
  href,
  children,
  primary,
}: {
  href: string
  children: React.ReactNode
  primary?: boolean
}) {
  return (
    <a
      href={href}
      className={cn(
        'inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors',
        primary
          ? 'bg-foreground text-background hover:opacity-85'
          : 'border border-input bg-background hover:bg-accent',
      )}
    >
      {children}
    </a>
  )
}

function PlatformRow({
  icon: Icon,
  name,
  beta,
  children,
}: {
  icon: LucideIcon
  name: string
  beta?: boolean
  children: React.ReactNode
}) {
  return (
    <li className="flex items-center gap-3 py-4">
      <Icon
        className="h-5 w-5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <span className="min-w-0 font-medium">
        {name}
        {beta && (
          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
            Beta
          </span>
        )}
      </span>
      <span className="ml-auto flex shrink-0 gap-2">{children}</span>
    </li>
  )
}

export function HeroVariantA({
  desktopVersion,
}: {
  desktopVersion: string | null
}) {
  const detected = PLATFORMS[useDetectedPlatform()]
  const PrimaryIcon = detected.kind === 'desktop' ? Download : ArrowRight

  return (
    <Section
      tone="none"
      spacing="hero"
      className="border-b bg-gradient-to-b from-muted/40 to-background"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Get WCPOS for free
        </h1>
        <div className="mt-8">
          <Button asChild variant="brand" size="xl">
            <a href={detected.href}>
              <PrimaryIcon aria-hidden="true" />
              {detected.action}
            </a>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {desktopVersion ? `Version ${desktopVersion} · ` : ''}
          Runs on the{' '}
          <a
            href="https://wordpress.org/plugins/woocommerce-pos/"
            className="font-medium text-wcpos-red-accent hover:underline"
          >
            free WordPress plugin
          </a>
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-7">
          <h2 className="text-2xl font-semibold tracking-tight">Desktop</h2>
          <ul className="mt-3 divide-y">
            <PlatformRow icon={Laptop} name="macOS">
              <Pill href={PLATFORMS['mac-arm'].href} primary>
                Download
              </Pill>
              <Pill href={PLATFORMS['mac-intel'].href}>Intel</Pill>
            </PlatformRow>
            <PlatformRow icon={Laptop} name="Windows">
              <Pill href={PLATFORMS.win.href} primary>
                Download
              </Pill>
            </PlatformRow>
            <PlatformRow icon={Laptop} name="Linux">
              <Pill href={PLATFORMS.linux.href} primary>
                Download
              </Pill>
            </PlatformRow>
          </ul>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-7">
          <h2 className="text-2xl font-semibold tracking-tight">
            Mobile &amp; Web
          </h2>
          <ul className="mt-3 divide-y">
            <PlatformRow icon={Tablet} name="iOS, iPadOS" beta>
              <Pill href={PLATFORMS.ios.href} primary>
                TestFlight
              </Pill>
            </PlatformRow>
            <PlatformRow icon={Smartphone} name="Android" beta>
              <Pill href={PLATFORMS.android.href} primary>
                Play Store
              </Pill>
            </PlatformRow>
            <PlatformRow icon={Globe} name="Web">
              <Pill href={PLATFORMS.web.href} primary>
                Open
              </Pill>
            </PlatformRow>
          </ul>
        </div>
      </div>
    </Section>
  )
}
