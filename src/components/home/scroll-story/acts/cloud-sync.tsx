import { cn } from '@/lib/utils'
import styles from '../story.module.css'

/**
 * Act 4's sync tableau: Woo cloud with bidirectional dashed arcs and floating
 * status chips, positioned above the (shrunken) tablet by the choreography.
 *
 * The cloud is a single SVG silhouette whose path gently morphs between
 * keyshapes (styles.cloudMorph); the static `d` below doubles as the resting
 * shape for reduced-motion and browsers without CSS `d` support.
 */
export function CloudSync({
  className,
  light = false,
}: {
  className?: string
  light?: boolean
}) {
  const chipClass = light
    ? 'border-slate-300 bg-white/90 text-slate-600'
    : 'border-slate-600 bg-slate-800/90 text-slate-300'
  return (
    <div
      aria-hidden="true"
      className={cn('relative h-[300px] w-[560px]', className)}
    >
      <div className="absolute left-1/2 top-1.5 h-[110px] w-[240px] -translate-x-1/2">
        <svg
          className="absolute inset-0 overflow-visible"
          viewBox="0 0 240 110"
          width="240"
          height="110"
          fill="none"
        >
          <path
            className={cn(
              styles.cloudMorph,
              light
                ? 'fill-white stroke-slate-300 drop-shadow-sm'
                : styles.cloudShapeDark
            )}
            strokeWidth="1"
            d="M 37.6 99.0 C 25.6 96.3, 25.9 91.6, 22.3 86.3 C 18.7 81.0, 16.3 73.7, 16.0 67.3 C 15.8 60.9, 17.6 53.5, 20.8 48.0 C 24.0 42.4, 29.6 37.1, 35.2 34.2 C 40.9 31.2, 48.4 29.6, 54.7 30.1 C 61.1 30.6, 69.2 38.1, 73.4 37.1 C 77.7 36.0, 77.5 27.7, 80.4 23.8 C 83.4 19.8, 87.2 16.1, 91.3 13.3 C 95.4 10.5, 100.1 8.3, 104.9 6.9 C 109.6 5.5, 114.9 4.8, 119.8 5.0 C 124.8 5.2, 129.9 6.3, 134.6 8.0 C 139.2 9.8, 143.8 12.4, 147.6 15.5 C 151.5 18.6, 155.0 22.6, 157.6 26.7 C 160.3 30.9, 159.7 39.5, 163.6 40.6 C 167.5 41.7, 175.1 34.1, 181.2 33.3 C 187.3 32.5, 194.4 33.4, 200.1 35.8 C 205.7 38.1, 211.5 42.5, 215.2 47.3 C 219.0 52.1, 221.8 58.8, 222.6 64.8 C 223.5 70.9, 222.6 78.0, 220.4 83.7 C 218.1 89.4, 220.3 95.9, 209.0 99.0 C 197.7 102.1, 171.6 101.9, 152.4 102.5 C 133.3 103.1, 113.3 103.1, 94.2 102.5 C 75.0 101.9, 49.6 101.7, 37.6 99.0 Z"
          />
        </svg>
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
