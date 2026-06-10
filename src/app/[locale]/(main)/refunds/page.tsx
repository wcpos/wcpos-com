import { setRequestLocale } from 'next-intl/server'

export const metadata = {
  title: 'Refund Policy',
  description:
    'WCPOS Pro is a digital product delivered immediately after purchase. Refunds are generally not given — try the free plugin, demo, and docs first. EU/UK consumer rights are honoured.',
}

export default async function RefundsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-3">Refund Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: 2026-06-10</p>
      </div>

      <div className="space-y-10">
        <section>
          <p className="leading-7 text-muted-foreground">
            WCPOS Pro is a digital product: your license key and downloads are
            available immediately after purchase, and once delivered they cannot
            be returned. Because of this,{' '}
            <strong className="text-foreground">
              we generally do not give refunds after purchase
            </strong>
            . Please make sure the plugin is right for your store before you buy
            — we make that easy, and we answer pre-sale questions openly and
            honestly.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Try before you buy</h2>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">
                Install the free plugin.
              </span>{' '}
              Run the free version of WooCommerce POS on your store for at least
              a couple of days before upgrading to Pro — that proves the plugin
              works on your site.
            </li>
            <li>
              <span className="font-medium text-foreground">Try the demo.</span>{' '}
              The{' '}
              <a
                href="https://demo.wcpos.com/pos"
                className="underline underline-offset-4 hover:text-foreground"
              >
                online demo
              </a>{' '}
              runs the current version with Pro activated, so you can confirm it
              fulfils your store&apos;s requirements.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Read the documentation.
              </span>{' '}
              Don&apos;t assume Pro has a feature you need — check the{' '}
              <a
                href="https://docs.wcpos.com"
                className="underline underline-offset-4 hover:text-foreground"
              >
                docs
              </a>{' '}
              and the demo to make sure it is right for you.
            </li>
            <li>
              Still unsure? Email{' '}
              <a
                href="mailto:support@wcpos.com"
                className="underline underline-offset-4 hover:text-foreground"
              >
                support@wcpos.com
              </a>{' '}
              with pre-sale questions.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            Consumers in the EU, EEA and UK
          </h2>
          <p className="leading-7 text-muted-foreground mb-4">
            If you purchase as a consumer in the European Union, the European
            Economic Area or the United Kingdom, you have a statutory right to
            withdraw from the purchase within 14 days without giving a reason.
            To exercise it, email{' '}
            <a
              href="mailto:support@wcpos.com"
              className="underline underline-offset-4 hover:text-foreground"
            >
              support@wcpos.com
            </a>{' '}
            from the email address you used for the purchase within 14 days. We
            will refund the full amount to your original payment method and
            revoke the license key.
          </p>
          <p className="leading-7 text-muted-foreground">
            Under those laws, the withdrawal right for digital content can end
            early once delivery begins with your express consent and
            acknowledgment. Where our checkout has not asked for that consent,
            we honour the full 14-day right.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Faulty products</h2>
          <p className="leading-7 text-muted-foreground">
            If WCPOS Pro is defective or does not work as described, contact{' '}
            <a
              href="mailto:support@wcpos.com"
              className="underline underline-offset-4 hover:text-foreground"
            >
              support@wcpos.com
            </a>{' '}
            and we will make it right — by fixing the problem or, where required
            by law, refunding you. Statutory remedies for faulty digital content
            apply regardless of the general no-refund policy above.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">How refunds are paid</h2>
          <p className="leading-7 text-muted-foreground">
            When a refund is given, it goes back to the original payment method
            via Stripe or PayPal and typically appears on your statement within
            5–10 business days, depending on your bank or card issuer. Refunded
            license keys are revoked and stop working immediately.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">License renewals</h2>
          <p className="leading-7 text-muted-foreground">
            Yearly licenses do not renew automatically — we never charge you
            again without a new purchase from you. When your license expires,
            you can choose to renew it from your account. If anything about a
            renewal purchase is not right, email{' '}
            <a
              href="mailto:support@wcpos.com"
              className="underline underline-offset-4 hover:text-foreground"
            >
              support@wcpos.com
            </a>{' '}
            and we will work it out with you.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Your statutory rights</h2>
          <p className="leading-7 text-muted-foreground">
            Nothing in this policy limits any rights you have under the consumer
            protection laws of your country. Where local law gives you stronger
            rights, those rights apply.
          </p>
        </section>
      </div>
    </main>
  )
}
