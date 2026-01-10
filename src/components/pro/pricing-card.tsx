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
import type { MedusaProduct } from '@/types/medusa'
import { formatPrice, getVariantPrice } from '@/services/core/external/medusa-client'

interface PricingCardProps {
  product: MedusaProduct
  featured?: boolean
  currencyCode?: string
}

const FEATURES = {
  yearly: [
    'All Pro features included',
    'Unlimited orders & products',
    'Priority email support',
    'Automatic updates for 1 year',
    'Cancel anytime',
  ],
  lifetime: [
    'All Pro features included',
    'Unlimited orders & products',
    'Priority email support',
    'Lifetime updates forever',
    'One-time payment',
    'Best value for long-term use',
  ],
}

export function PricingCard({
  product,
  featured = false,
  currencyCode = 'usd',
}: PricingCardProps) {
  const variant = product.variants[0]
  const price = variant ? getVariantPrice(variant, currencyCode) : null
  const isLifetime = product.handle === 'wcpos-pro-lifetime'
  const features = isLifetime ? FEATURES.lifetime : FEATURES.yearly

  return (
    <Card
      className={`relative flex flex-col ${
        featured
          ? 'border-primary shadow-lg scale-105'
          : 'border-border'
      }`}
    >
      {featured && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Most Popular
        </Badge>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">{product.title}</CardTitle>
        <CardDescription className="text-sm">
          {isLifetime ? 'One-time purchase' : 'Annual subscription'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-center mb-6">
          <span className="text-4xl font-bold">
            {price !== null ? formatPrice(price, currencyCode) : 'N/A'}
          </span>
          {!isLifetime && (
            <span className="text-muted-foreground">/year</span>
          )}
        </div>
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          size="lg"
          variant={featured ? 'default' : 'outline'}
        >
          Get Started
        </Button>
      </CardFooter>
    </Card>
  )
}
