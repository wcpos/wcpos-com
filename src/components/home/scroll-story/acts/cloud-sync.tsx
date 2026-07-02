import { cn } from '@/lib/utils'
import styles from '../story.module.css'

/**
 * Act 4's sync tableau: Woo cloud with bidirectional dashed arcs and floating
 * status chips, positioned above the (shrunken) tablet by the choreography.
 */
export function CloudSync({
  className,
  light = false,
}: {
  className?: string
  light?: boolean
}) {
  const puffClass = light
    ? 'border border-slate-300 bg-white shadow-sm'
    : styles.cloudPuff
  const chipClass = light
    ? 'border-slate-300 bg-white/90 text-slate-600'
    : 'border-slate-600 bg-slate-800/90 text-slate-300'
  return (
    <div
      aria-hidden="true"
      className={cn('relative h-[300px] w-[560px]', className)}
    >
      <div className="absolute left-1/2 top-1.5 h-[110px] w-[240px] -translate-x-1/2">
        <i
          className={cn(
            'absolute bottom-0 left-0 h-[74px] w-[110px] rounded-full',
            puffClass
          )}
        />
        <i
          className={cn(
            'absolute left-[52px] top-0 h-[100px] w-[130px] rounded-full',
            puffClass
          )}
        />
        <i
          className={cn(
            'absolute bottom-0 right-0 h-[66px] w-[120px] rounded-full',
            puffClass
          )}
        />
        <span
          className={cn(
            'absolute left-1/2 top-1/2 z-[2] flex h-[62px] w-[62px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-lg font-extrabold text-white',
            styles.wooBadge
          )}
        >
          Woo
        </span>
      </div>

      <svg
        className="absolute left-1/2 top-[108px] h-[190px] w-[300px] -translate-x-1/2 overflow-visible"
        viewBox="0 0 300 190"
        fill="none"
      >
        <path
          className={cn('stroke-slate-500', styles.dashFlow)}
          strokeWidth="2"
          strokeDasharray="6 8"
          d="M 40 10 C 5 70, 25 150, 90 185"
        />
        <path
          className={cn('stroke-emerald-600', styles.dashFlow)}
          style={{ animationDirection: 'reverse' }}
          strokeWidth="2"
          strokeDasharray="6 8"
          d="M 260 10 C 295 70, 275 150, 210 185"
        />
        {/* payment pulses riding the sync lines (Stripe-globe style):
            products flow down to the register, orders flow up to Woo */}
        {[0, 1].map((i) => (
          <circle key={`down-${i}`} r="3.2" className="fill-slate-400">
            <animateMotion
              dur="3.2s"
              begin={`${i * 1.6}s`}
              repeatCount="indefinite"
              path="M 40 10 C 5 70, 25 150, 90 185"
            />
          </circle>
        ))}
        {[0, 1].map((i) => (
          <circle key={`up-${i}`} r="3.2" className="fill-emerald-500">
            <animateMotion
              dur="2.6s"
              begin={`${i * 1.3}s`}
              repeatCount="indefinite"
              keyPoints="1;0"
              keyTimes="0;1"
              calcMode="linear"
              path="M 260 10 C 295 70, 275 150, 210 185"
            />
          </circle>
        ))}
      </svg>

      <span
        className={cn(
          'absolute -left-14 top-[60px] whitespace-nowrap rounded-lg border px-3 py-1.5 font-mono text-[11px]',
          chipClass,
          styles.floaty
        )}
      >
        1,204 products <span className="text-emerald-400">● synced</span>
      </span>
      <span
        className={cn(
          'absolute -right-16 top-[46px] whitespace-nowrap rounded-lg border px-3 py-1.5 font-mono text-[11px]',
          chipClass,
          styles.floaty
        )}
        style={{ animationDelay: '1.2s' }}
      >
        orders → Woo <span className="text-emerald-400">●</span>
      </span>
      <span
        className={cn(
          'absolute -right-10 top-[150px] whitespace-nowrap rounded-lg border px-3 py-1.5 font-mono text-[11px]',
          chipClass,
          styles.floaty
        )}
        style={{ animationDelay: '0.6s' }}
      >
        works offline <span className="text-emerald-400">●</span>
      </span>
    </div>
  )
}
