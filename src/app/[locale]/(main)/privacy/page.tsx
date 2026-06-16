import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export const metadata = {
  title: 'Privacy Policy',
  description:
    'How WCPOS collects, uses, and protects your personal data, including analytics, cookies, payment processing, and your rights under GDPR.',
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: 2026-06-10</p>
      </div>

      <div className="space-y-10">
        <section>
          <p className="leading-7 text-muted-foreground">
            WCPOS (&quot;we&quot;, &quot;us&quot;) operates wcpos.com, the website for the
            WooCommerce POS plugin and WCPOS Pro. This policy explains what personal
            data we collect when you use the site, why we collect it, who processes it
            on our behalf, and what rights you have over it. We aim to collect as
            little as we need to run the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">What we collect</h2>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Account information.</span>{' '}
              Your email address and name when you create an account, either directly
              or by signing in with Google, GitHub, or Discord. When you use a sign-in
              provider, we receive only your basic profile (email, name or username,
              and avatar or picture URL) from that provider, and may store the avatar
              or picture URL on your account as <code>oauth_avatar_url</code>.
            </li>
            <li>
              <span className="font-medium text-foreground">Billing details.</span>{' '}
              The billing address and any company details you enter at checkout,
              stored with your customer record so we can issue receipts and comply
              with tax rules.
            </li>
            <li>
              <span className="font-medium text-foreground">Order and license history.</span>{' '}
              Records of your purchases, license keys, and plugin downloads, so you
              can manage your licenses and we can provide support.
            </li>
            <li>
              <span className="font-medium text-foreground">Payment information.</span>{' '}
              Payments are handled by Stripe and PayPal. Your full card number or
              payment credentials never reach our servers; we receive only a payment
              confirmation and the details needed for the receipt.
            </li>
            <li>
              <span className="font-medium text-foreground">Usage analytics.</span>{' '}
              We use PostHog to understand how the site is used (pages viewed, buttons
              clicked). To do this, we set a cookie containing a randomly generated
              identifier. It does not contain your name or email.
            </li>
            <li>
              <span className="font-medium text-foreground">Error reports.</span>{' '}
              If something breaks, an error report may be sent to Sentry. Reports can
              include technical details such as your browser and operating system and
              what the application was doing at the time of the error.
            </li>
            <li>
              <span className="font-medium text-foreground">Server logs.</span>{' '}
              Our servers keep application logs (in Grafana Loki) for debugging and
              operating the service.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Cookies</h2>
          <p className="leading-7 text-muted-foreground mb-4">
            We use a small number of first-party cookies. We do not use third-party
            advertising cookies.
          </p>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">medusa-token</span> — keeps
              you signed in to your account. Expires after 1 day.
            </li>
            <li>
              <span className="font-medium text-foreground">wcpos-analytics-consent</span> —
              remembers your analytics consent choice (accepted or declined).
              Expires after 182 days.
            </li>
            <li>
              <span className="font-medium text-foreground">wcpos-distinct-id</span> — a
              random identifier used for analytics. Only set after you accept
              analytics on the consent banner; removed if you decline. Expires
              after 1 year.
            </li>
            <li>
              <span className="font-medium text-foreground">NEXT_LOCALE</span> —
              remembers your language preference.
            </li>
            <li>
              Your light/dark theme preference is stored locally in your browser and is
              never sent to us.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Who processes your data</h2>
          <p className="leading-7 text-muted-foreground mb-4">
            We use the following service providers to run wcpos.com. Each receives only
            the data needed for its role:
          </p>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Our commerce backend (Medusa)</span> —
              self-hosted on Hetzner infrastructure in the EU. Stores accounts,
              customer records, and orders.
            </li>
            <li>
              <span className="font-medium text-foreground">Stripe</span> — card payment
              processing.
            </li>
            <li>
              <span className="font-medium text-foreground">PayPal</span> — PayPal
              payment processing.
            </li>
            <li>
              <span className="font-medium text-foreground">Keygen</span> — software
              license management (license keys and activations).
            </li>
            <li>
              <span className="font-medium text-foreground">PostHog</span> — product
              analytics.
            </li>
            <li>
              <span className="font-medium text-foreground">Sentry</span> — error
              monitoring.
            </li>
            <li>
              <span className="font-medium text-foreground">Vercel</span> — website
              hosting and content delivery.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">How long we keep data</h2>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            <li>
              Account and license data is kept while your account is active. If you ask
              us to delete your account, we delete it, except where we are legally
              required to keep records.
            </li>
            <li>
              Order and invoice records are kept for as long as tax and accounting laws
              require.
            </li>
            <li>
              The analytics identifier cookie expires after 1 year.
            </li>
            <li>
              Server logs and error reports are kept for a limited operational window
              and then deleted.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Your rights</h2>
          <p className="leading-7 text-muted-foreground mb-4">
            If you are in the EU/EEA or UK, you have rights under the GDPR, including
            the right to access, correct, delete, and export your personal data, and to
            object to or restrict certain processing. We extend the same rights to all
            users regardless of location.
          </p>
          <p className="leading-7 text-muted-foreground">
            To exercise any of these rights, email us at{' '}
            <a
              href="mailto:support@wcpos.com"
              className="underline underline-offset-4 hover:text-foreground"
            >
              support@wcpos.com
            </a>{' '}
            so we can verify your identity privately. EU/EEA residents also have the
            right to lodge a complaint with their local data protection authority.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Changes to this policy</h2>
          <p className="leading-7 text-muted-foreground">
            If we make material changes to this policy, we will update the date at the
            top of this page. Continued use of the site after a change means the
            updated policy applies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact</h2>
          <p className="leading-7 text-muted-foreground">
            Questions about this policy or your data? Email us at{' '}
            <a
              href="mailto:support@wcpos.com"
              className="underline underline-offset-4 hover:text-foreground"
            >
              support@wcpos.com
            </a>{' '}
            or ask general questions in the community chat on the{' '}
            <Link href="/support" className="underline underline-offset-4 hover:text-foreground">
              support page
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
