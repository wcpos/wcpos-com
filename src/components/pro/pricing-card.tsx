import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ProCheckoutVariant } from '@/services/core/analytics/posthog-service'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import {
  buildProCheckoutHref,
  getProCheckoutCtaLabel,
  type ProOffer,
} from '@/lib/pro-offer-catalog'

interface PricingCardProps {
  offer: ProOffer
  experimentVariant?: ProCheckoutVariant
}

export function PricingCard({
  offer,
  experimentVariant = 'control',
}: PricingCardProps) {
  const checkoutHref = buildProCheckoutHref(offer, experimentVariant)
  const ctaLabel = getProCheckoutCtaLabel(experimentVariant)

  return (
    <Card
      data-testid="pricing-card"
      className={`relative flex flex-col ${
        offer.featured
          ? 'border-primary shadow-lg scale-105'
          : 'border-border'
      }`}
    >
      {offer.badgeLabel && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          {offer.badgeLabel}
        </Badge>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">{offer.title}</CardTitle>
        <CardDescription className="text-sm">
          {offer.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-center mb-6">
          <span className="text-4xl font-bold">
            {offer.price.formatted}
          </span>
          {offer.priceSuffix && (
            <span className="text-muted-foreground">{offer.priceSuffix}</span>
          )}
        </div>
        <ul className="space-y-3">
          {offer.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          asChild
          className="w-full"
          size="lg"
          variant={offer.featured ? 'default' : 'outline'}
        >
          <TrackedLocaleLink
            href={checkoutHref}
            eventName="click_start_checkout"
            eventProperties={{
              experiment: 'pro_checkout_v1',
              variant: experimentVariant,
              product: offer.handle,
              plan: offer.planId,
            }}
          >
            {ctaLabel}
          </TrackedLocaleLink>
        </Button>
      </CardFooter>
    </Card>
  )
}
