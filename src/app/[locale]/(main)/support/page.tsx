import { setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { SupportChat } from '@/components/support/support-chat'
import { DiscordSection } from '@/components/support/discord-section'
import { marketingMetadata } from '@/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return marketingMetadata({
    locale,
    path: '/support',
    title: 'Support',
    description:
      'Ask anything about WooCommerce POS and get an instant answer from our docs, or chat with the community on Discord.',
  })
}

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main>
      <section className="container mx-auto px-4 py-20 md:py-28">
        <SupportChat />
      </section>
      <DiscordSection />
    </main>
  )
}
