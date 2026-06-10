import { setRequestLocale } from 'next-intl/server'

export const metadata = {
  title: 'Refund Policy',
  description:
    'The WCPOS Pro money-back guarantee: how refunds work, how to request one, and how license renewals are handled.',
}

/*
 * OWNER DECISION REQUIRED before publication:
 * The refund window below (30 days) is a draft placeholder. Common choices are
 * 14 or 30 days. Pick the window, update the copy in the "Money-back guarantee"
 * section, and confirm whether renewals of yearly licenses are also refundable
 * within that window. See the PR body for the full list of facts to verify.
 */

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
            We want WCPOS Pro to work for your store. If it doesn&apos;t, we make
            refunds simple: ask within the guarantee window and we will give your
            money back. No lengthy forms, no hoops.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Money-back guarantee</h2>
          <p className="leading-7 text-muted-foreground">
            Every first purchase of a WCPOS Pro license — yearly or lifetime — comes
            with a 30-day money-back guarantee. If you are not satisfied for any
            reason, request a refund within 30 days of your purchase and we will
            refund the full amount.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">How to request a refund</h2>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            <li>
              Email us at{' '}
              <a
                href="mailto:support@wcpos.com"
                className="underline underline-offset-4 hover:text-foreground"
              >
                support@wcpos.com
              </a>{' '}
              from the email address you used for the purchase.
            </li>
            <li>
              Telling us why you&apos;re asking helps us improve, but it is not
              required to get the refund.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">How refunds are paid</h2>
          <p className="leading-7 text-muted-foreground">
            Refunds go back to the original payment method via Stripe or PayPal. Once
            we process a refund, it typically appears on your statement within 5–10
            business days, depending on your bank or card issuer. When a license is
            refunded, the license key is deactivated.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">License renewals</h2>
          <p className="leading-7 text-muted-foreground">
            Yearly licenses do not renew automatically, and we never charge you again
            without a new purchase. When your license expires, you can choose to renew
            it from your account. If anything about a renewal purchase is not right,
            email us at{' '}
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
