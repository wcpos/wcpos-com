/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Variant A — "Static-first cards".
 * Same two-card layout as production, but the cards render immediately from
 * static plan copy; only the price number suspends. Minimal-change answer to
 * "don't skeleton the whole block".
 */
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
import { Link } from '@/i18n/navigation'
import { PROTOTYPE_PLANS, type PrototypePlan } from './plans'
import { PriceSlot } from './price-slot'

function StaticFirstCard({
  plan,
  delayMs,
}: {
  plan: PrototypePlan
  delayMs: number
}) {
  return (
    <Card
      className={`relative flex flex-col ${
        plan.featured ? 'border-primary shadow-lg scale-105' : 'border-border'
      }`}
    >
      {plan.badgeLabel && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          {plan.badgeLabel}
        </Badge>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">{plan.title}</CardTitle>
        <CardDescription className="text-sm">
          {plan.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-center mb-6">
          <span className="text-4xl font-bold">
            <PriceSlot
              planId={plan.planId}
              delayMs={delayMs}
              fallbackClassName="w-20"
            />
          </span>
          {plan.priceSuffix && (
            <span className="text-muted-foreground">{plan.priceSuffix}</span>
          )}
        </div>
        <ul className="space-y-3">
          {plan.features.map((feature) => (
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
          variant={plan.featured ? 'default' : 'outline'}
        >
          <Link href={plan.checkoutHref}>Get Started</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export function VariantA({ delayMs }: { delayMs: number }) {
  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
      <StaticFirstCard plan={PROTOTYPE_PLANS.yearly} delayMs={delayMs} />
      <StaticFirstCard plan={PROTOTYPE_PLANS.lifetime} delayMs={delayMs} />
    </div>
  )
}
