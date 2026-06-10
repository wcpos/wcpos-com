import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export const metadata = {
  title: 'Terms of Service',
  description:
    'The terms that govern your use of wcpos.com, your WCPOS account, and WCPOS Pro licenses.',
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-3">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: 2026-06-10</p>
      </div>

      <div className="space-y-10">
        <section>
          <p className="leading-7 text-muted-foreground">
            These terms govern your use of wcpos.com, your WCPOS account, and any
            WCPOS Pro license you purchase. By using the site or buying a license, you
            agree to these terms. If you do not agree, please do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">The service</h2>
          <p className="leading-7 text-muted-foreground">
            WCPOS provides the wcpos.com website, user accounts, and paid WCPOS Pro
            licenses that unlock premium features, updates, and priority support for
            the WooCommerce POS plugin.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">The free plugin and the GPL</h2>
          <p className="leading-7 text-muted-foreground">
            The free WooCommerce POS plugin is open-source software released under the
            GNU General Public License (GPL). Nothing in these terms limits the rights
            the GPL grants you over that code. A Pro license is separate: it covers
            access to Pro features, license keys, automatic updates, and priority
            support — not a restriction on the open-source code itself.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Your account</h2>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            <li>Provide accurate information when registering and keep it up to date.</li>
            <li>
              Keep your credentials secure. You are responsible for activity that
              happens under your account.
            </li>
            <li>
              Tell us promptly at{' '}
              <a
                href="mailto:support@wcpos.com"
                className="underline underline-offset-4 hover:text-foreground"
              >
                support@wcpos.com
              </a>{' '}
              if you suspect unauthorized access to your account.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Purchases and licenses</h2>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Yearly license.</span> A
              one-time payment that includes Pro features, automatic updates, and
              priority support for one year. It does not renew automatically and we
              never charge you again without a new purchase. When it expires, you can
              choose to renew it from your account for another year.
            </li>
            <li>
              <span className="font-medium text-foreground">Lifetime license.</span> A
              one-time purchase that includes Pro features, updates, and priority
              support for the lifetime of the product.
            </li>
            <li>
              License keys are for activating WCPOS Pro on your own sites within the
              limits of the license you purchased. Do not share, resell, or publish
              license keys.
            </li>
            <li>
              Prices are shown at checkout before you pay. Payment is handled by
              Stripe or PayPal.
            </li>
            <li>
              Refunds are handled according to our{' '}
              <Link href="/refunds" className="underline underline-offset-4 hover:text-foreground">
                refund policy
              </Link>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Acceptable use</h2>
          <p className="leading-7 text-muted-foreground mb-4">When using the service, you agree not to:</p>
          <ul className="list-disc pl-6 space-y-3 leading-7 text-muted-foreground">
            <li>Break the law or infringe the rights of others.</li>
            <li>
              Attempt to gain unauthorized access to accounts, systems, or data, or
              probe the service for vulnerabilities without permission.
            </li>
            <li>
              Interfere with the operation of the service, including overloading it or
              automated scraping at disruptive volumes.
            </li>
            <li>
              Circumvent license checks or use license keys beyond the terms of your
              purchase. (This does not limit your GPL rights over the open-source
              plugin code.)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Warranty disclaimer</h2>
          <p className="leading-7 text-muted-foreground">
            The service and software are provided &quot;as is&quot; and &quot;as
            available&quot;, without warranties of any kind, express or implied,
            including merchantability, fitness for a particular purpose, and
            non-infringement. We do not promise that the service will be uninterrupted
            or error-free. Some jurisdictions do not allow certain warranty
            exclusions, so parts of this section may not apply to you.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Limitation of liability</h2>
          <p className="leading-7 text-muted-foreground">
            To the maximum extent permitted by law, WCPOS will not be liable for
            indirect, incidental, special, or consequential damages, or for lost
            profits, revenue, or data. Our total liability for any claim relating to
            the service is limited to the amount you paid us in the 12 months before
            the claim arose. Nothing in these terms excludes liability that cannot be
            excluded by law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Termination</h2>
          <p className="leading-7 text-muted-foreground">
            You can stop using the service and ask us to delete your account at any
            time. We may suspend or terminate accounts that violate these terms.
            Sections that by their nature should survive (such as the warranty
            disclaimer and liability limits) survive termination.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Changes to these terms</h2>
          <p className="leading-7 text-muted-foreground">
            If we make material changes, we will update the date at the top of this
            page. Continued use of the service after a change means the updated terms
            apply.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact</h2>
          <p className="leading-7 text-muted-foreground">
            Questions about these terms? Email us at{' '}
            <a
              href="mailto:support@wcpos.com"
              className="underline underline-offset-4 hover:text-foreground"
            >
              support@wcpos.com
            </a>{' '}
            or ask in the community chat on the{' '}
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
