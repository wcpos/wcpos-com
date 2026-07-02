import { Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

const demoProducts = [
  { name: 'Tote Bag', price: '$29' },
  { name: 'Candle', price: '$24' },
  { name: 'Mug', price: '$18' },
  { name: 'Soap Bar', price: '$9' },
  { name: 'Notebook', price: '$14' },
  { name: 'Tea Towel', price: '$16' },
]

const demoCart = [
  { name: 'Candle', qty: 1, total: '$24' },
  { name: '2× Mug', qty: 2, total: '$36' },
  { name: 'Soap Bar', qty: 1, total: '$9' },
]

/**
 * The live POS UI shown on every device screen in the scroll story.
 * Decorative DOM (no images, no client JS) so it stays crisp under CSS 3D
 * transforms and swaps for nothing when real artwork lands — artwork replaces
 * device bodies, never this screen.
 */
export function PosScreen({
  variant = 'tablet',
  register = 'Register 1',
  className,
}: {
  variant?: 'tablet' | 'laptop' | 'phone'
  register?: string
  className?: string
}) {
  if (variant === 'phone') {
    return (
      <div
        className={cn(
          'flex h-full flex-col overflow-hidden rounded-[14px] bg-slate-950',
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-2.5 py-1.5">
          <span className="text-[9px] font-bold tracking-wide text-white">
            WCPOS
          </span>
          <Wifi className="h-2.5 w-2.5 text-emerald-400" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-2">
          {demoProducts.slice(0, 4).map((product) => (
            <div
              key={product.name}
              className="flex items-center justify-between rounded-md bg-slate-800 px-2 py-1.5"
            >
              <span className="text-[8px] font-medium text-slate-300">
                {product.name}
              </span>
              <span className="text-[8px] text-slate-500">{product.price}</span>
            </div>
          ))}
        </div>
        <div className="m-2 rounded-md bg-wcpos-red py-1.5 text-center text-[9px] font-bold text-white">
          Charge $69
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-lg bg-slate-950',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <span className="text-xs font-bold tracking-wide text-white">
          WCPOS
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-medium text-slate-400">
            {register} · online
          </span>
          <Wifi className="h-3 w-3 text-emerald-400" />
        </div>
      </div>
      <div className="flex flex-1">
        <div className="grid flex-1 grid-cols-3 gap-2 p-2.5">
          {demoProducts.map((product, i) => (
            <div
              key={product.name}
              className="flex flex-col overflow-hidden rounded-md bg-slate-800"
            >
              <div
                className={cn(
                  'w-full flex-1',
                  i % 3 === 0
                    ? 'bg-slate-700'
                    : i % 3 === 1
                      ? 'bg-wcpos-red/30'
                      : 'bg-slate-600/70'
                )}
              />
              <p className="truncate px-1.5 py-1 text-[9px] font-medium text-slate-300">
                {product.name}
                <span className="float-right text-slate-500">
                  {product.price}
                </span>
              </p>
            </div>
          ))}
        </div>
        <div className="flex w-32 flex-col border-l border-slate-800 p-2.5">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
            Cart
          </p>
          <div className="flex-1 space-y-1.5">
            {demoCart.map((line) => (
              <div
                key={line.name}
                className="flex justify-between text-[10px] text-slate-300"
              >
                <span className="truncate">{line.name}</span>
                <span>{line.total}</span>
              </div>
            ))}
          </div>
          <div className="rounded-md bg-wcpos-red py-2 text-center text-[11px] font-bold text-white">
            Charge $69
          </div>
        </div>
      </div>
    </div>
  )
}
