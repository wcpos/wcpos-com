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
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ ref?: string | string[] }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  setRequestLocale(locale)
  const ref = Array.isArray(query?.ref) ? query.ref[0] : query?.ref
  const supportRef = ref?.trim()

  if (supportRef) {
    return (
      <main>
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
              Contact support about your order
            </h1>
            <p className="text-base text-muted-foreground">
              Quote reference <span className="font-mono font-medium">{supportRef}</span> so we
              can confirm the payment or finish the order before you pay again.
            </p>
          </div>
        </section>
        <DiscordSection />
        <section className="container mx-auto px-4 py-16">
          <SupportChat />
        </section>
      </main>
    )
  }

  return (
    <main>
      <section className="container mx-auto px-4 py-20 md:py-28">
        <SupportChat />
      </section>
      <DiscordSection />
    </main>
  )
}
