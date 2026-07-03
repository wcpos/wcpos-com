import { useId } from 'react'
import { cn } from '@/lib/utils'
import styles from '../story.module.css'

/* Resting cloud silhouette (keyshape A of the morph, see story.module.css) —
   also what reduced-motion and browsers without CSS `d` support get. */
const CLOUD_REST =
  'M 23.9 99.0 C 11.4 96.5, 15.0 92.2, 12.8 87.7 C 10.5 83.2, 9.5 76.9, 10.3 72.0 C 11.1 67.0, 13.9 61.4, 17.5 57.8 C 21.0 54.2, 26.5 51.3, 31.5 50.4 C 36.5 49.5, 44.5 54.5, 47.2 52.6 C 50.0 50.6, 47.0 43.1, 48.0 38.6 C 49.1 34.1, 50.9 29.5, 53.3 25.6 C 55.7 21.7, 58.9 17.9, 62.4 15.0 C 66.0 12.0, 70.2 9.5, 74.5 7.9 C 78.8 6.2, 83.6 5.2, 88.2 5.0 C 92.8 4.8, 97.7 5.4, 102.1 6.7 C 106.6 8.0, 111.0 10.2, 114.7 12.8 C 118.5 15.5, 121.7 21.5, 124.7 22.7 C 127.7 23.8, 130.0 20.5, 132.8 19.9 C 135.5 19.3, 138.4 19.0, 141.2 19.0 C 144.0 19.0, 146.9 19.4, 149.6 20.0 C 152.4 20.6, 155.1 21.6, 157.6 22.8 C 160.1 24.1, 162.6 25.6, 164.8 27.4 C 167.0 29.1, 169.0 31.2, 170.8 33.4 C 172.5 35.6, 173.1 39.4, 175.3 40.6 C 177.4 41.7, 181.0 39.9, 183.9 40.1 C 186.7 40.4, 189.6 41.2, 192.2 42.3 C 194.8 43.4, 197.4 44.9, 199.6 46.7 C 201.8 48.6, 203.8 50.8, 205.3 53.2 C 206.9 55.6, 206.3 58.9, 208.9 61.0 C 211.5 63.1, 217.9 63.1, 221.0 65.8 C 224.1 68.4, 226.8 72.9, 227.6 77.0 C 228.4 81.0, 227.7 86.2, 225.9 89.8 C 224.1 93.5, 228.9 96.9, 216.7 99.0 C 204.6 101.1, 174.6 101.9, 153.1 102.5 C 131.5 103.1, 109.0 103.1, 87.5 102.5 C 66.0 101.9, 36.3 101.5, 23.9 99.0 Z'

/**
 * Act 4's sync tableau: Woo cloud with bidirectional dashed arcs and floating
 * status chips, positioned above the (shrunken) tablet by the choreography.
 *
 * The cloud is a single SVG silhouette whose path gently morphs between
 * bubbly keyshapes (styles.cloudMorph). Light mode adds a volume gradient
 * and soft sheen highlights (blurred ellipses sitting well inside every
 * keyshape, so they never poke out as the silhouette breathes).
 */
export function CloudSync({
  className,
  light = false,
}: {
  className?: string
  light?: boolean
}) {
  const svgId = useId()
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
          {light ? (
            <>
              <defs>
                <linearGradient
                  id={`${svgId}-body`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="0.55" stopColor="#f3f7fb" />
                  <stop offset="1" stopColor="#d5e0ec" />
                </linearGradient>
                <filter
                  id={`${svgId}-soft`}
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="5" />
                </filter>
              </defs>
              <path
                className={cn(
                  styles.cloudMorph,
                  'drop-shadow-[0_10px_18px_rgba(51,65,85,0.16)]'
                )}
                fill={`url(#${svgId}-body)`}
                d={CLOUD_REST}
              />
              <g filter={`url(#${svgId}-soft)`} opacity="0.85">
                <ellipse cx="82" cy="34" rx="26" ry="12" fill="#fff" />
                <ellipse
                  cx="138"
                  cy="40"
                  rx="18"
                  ry="8"
                  fill="#fff"
                  opacity="0.8"
                />
                <ellipse
                  cx="40"
                  cy="66"
                  rx="10"
                  ry="5"
                  fill="#fff"
                  opacity="0.7"
                />
              </g>
            </>
          ) : (
            <path
              className={cn(styles.cloudMorph, styles.cloudShapeDark)}
              strokeWidth="1"
              d={CLOUD_REST}
            />
          )}
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
