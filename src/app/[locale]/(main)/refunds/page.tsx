import { setRequestLocale } from 'next-intl/server'

export const metadata = {
  title: 'Refund Policy',
  description:
    'The WCPOS Pro refund policy: how to request a refund within 14 days of purchase, and how refunds are paid.',
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
            WCPOS Pro purchases — first purchase or renewal, yearly or
            lifetime — can be refunded within 14 days of purchase. Email us
            within that window and we refund you in full. You do not need to
            give a reason.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            The best refund is the one you never need
          </h2>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">
                Install the free plugin.
              </span>{' '}
              Run the free version of WCPOS on your store for a
              couple of days before upgrading — that proves the plugin works on
              your site.
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
              runs the current version with Pro activated, so you can confirm
              it fulfils your store&apos;s requirements.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Read the documentation.
              </span>{' '}
              Check the{' '}
              <a
                href="https://docs.wcpos.com"
                className="underline underline-offset-4 hover:text-foreground"
              >
                docs
              </a>{' '}
              for the features you need, and email{' '}
              <a
                href="mailto:support@wcpos.com"
                className="underline underline-offset-4 hover:text-foreground"
              >
                support@wcpos.com
              </a>{' '}
              with pre-sale questions — we answer openly and honestly.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">How to request a refund</h2>
          <p className="leading-7 text-muted-foreground">
            Email{' '}
            <a
              href="mailto:support@wcpos.com"
              className="underline underline-offset-4 hover:text-foreground"
            >
              support@wcpos.com
            </a>{' '}
            from the email address you used for the purchase, within 14 days of
            buying. Telling us why helps us improve, but it is not required to
            get the refund.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">How refunds are paid</h2>
          <p className="leading-7 text-muted-foreground">
            Refunds go back to the original payment method via Stripe or PayPal
            and typically appear on your statement within 5–10 business days,
            depending on your bank or card issuer. Refunded license keys are
            revoked and stop working immediately.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">License renewals</h2>
          <p className="leading-7 text-muted-foreground">
            Yearly licenses do not renew automatically — we never charge you
            again without a new purchase from you. The same 14-day refund
            window applies to renewal purchases.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Your statutory rights</h2>
          <p className="leading-7 text-muted-foreground mb-4">
            For consumers in the EU, EEA and UK: our 14-day refund window
            matches your statutory right of withdrawal for this kind of
            purchase, and exercising either works the same way — email us
            within 14 days.
          </p>
          <p className="leading-7 text-muted-foreground">
            If WCPOS Pro is defective or does not work as described, statutory
            remedies for faulty digital content apply at any time, independent
            of the 14-day window. And nothing in this policy limits any rights
            you have under the consumer protection laws of your country —
            where local law gives you stronger rights, those rights apply.
          </p>
        </section>
      </div>
    </main>
  )
}
