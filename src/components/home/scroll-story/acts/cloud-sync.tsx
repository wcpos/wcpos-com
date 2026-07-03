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
          className={cn(
            'absolute inset-0 overflow-visible',
            light && 'drop-shadow-[0_12px_20px_rgba(51,65,85,0.14)]'
          )}
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
                  <stop offset="0.6" stopColor="#f4f8fc" />
                  <stop offset="1" stopColor="#d3dfec" />
                </linearGradient>
                {/* squishy pillow shading: NO edge displacement — diffuse
                    lighting on the smooth blurred alpha plumps each lobe,
                    the component transfer lifts the shadow floor so the
                    cloud stays white, and a whisper of final blur keeps the
                    edge comfy (bench notes in PR #237) */}
                <filter
                  id={`${svgId}-pillow`}
                  x="-20%"
                  y="-35%"
                  width="140%"
                  height="180%"
                  colorInterpolationFilters="sRGB"
                >
                  <feGaussianBlur
                    in="SourceGraphic"
                    stdDeviation="9"
                    result="soft"
                  />
                  <feDiffuseLighting
                    in="soft"
                    surfaceScale="12"
                    diffuseConstant="1.25"
                    lightingColor="#ffffff"
                    result="lit"
                  >
                    <feDistantLight azimuth="225" elevation="55" />
                  </feDiffuseLighting>
                  <feComponentTransfer in="lit" result="litLift">
                    <feFuncR type="linear" slope="0.28" intercept="0.72" />
                    <feFuncG type="linear" slope="0.28" intercept="0.72" />
                    <feFuncB type="linear" slope="0.28" intercept="0.72" />
                  </feComponentTransfer>
                  <feComposite
                    in="litLift"
                    in2="SourceGraphic"
                    operator="in"
                    result="litClip"
                  />
                  <feBlend
                    in="SourceGraphic"
                    in2="litClip"
                    mode="multiply"
                    result="shaded"
                  />
                  <feComposite
                    in="shaded"
                    in2="SourceGraphic"
                    operator="arithmetic"
                    k1="0"
                    k2="0.92"
                    k3="0.08"
                    k4="0"
                    result="mix"
                  />
                  <feGaussianBlur in="mix" stdDeviation="0.7" />
                </filter>
              </defs>
              <path
                className={styles.cloudMorph}
                fill={`url(#${svgId}-body)`}
                filter={`url(#${svgId}-pillow)`}
                d={CLOUD_REST}
              />
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
            'absolute left-1/2 top-1/2 z-[2] flex h-[62px] w-[62px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full',
            styles.wooBadge
          )}
        >
          {/* official Woo wordmark (simple-icons "Woo") */}
          <svg viewBox="0 0 24 24" width="42" height="42" aria-hidden="true">
            <path
              fill="#ffffff"
              d="M10.118 8.895c-.562 0-.928.183-1.255.797l-1.49 2.811v-2.496c0-.745-.353-1.111-1.007-1.111s-.928.222-1.255.85l-1.412 2.757v-2.47c0-.797-.327-1.137-1.124-1.137H.954C.34 8.895 0 9.183 0 9.706s.327.837.928.837h.667v3.15c0 .889.601 1.412 1.464 1.412s1.255-.34 1.686-1.137l.941-1.765v1.49c0 .876.575 1.412 1.451 1.412s1.203-.301 1.699-1.137l2.17-3.66c.471-.798.144-1.413-.901-1.413zm4.078 0c-1.778 0-3.124 1.321-3.124 3.112s1.359 3.098 3.124 3.098 3.111-1.32 3.124-3.098c0-1.791-1.359-3.112-3.124-3.112m0 4.301c-.667 0-1.124-.497-1.124-1.19s.458-1.203 1.124-1.203 1.124.51 1.124 1.203-.444 1.19-1.124 1.19m6.68-4.301c-1.765 0-3.124 1.32-3.124 3.111s1.359 3.098 3.124 3.098S24 13.784 24 12.006s-1.359-3.111-3.124-3.111m0 4.301c-.68 0-1.111-.497-1.111-1.19s.444-1.203 1.111-1.203S22 11.313 22 12.006s-.444 1.19-1.124 1.19"
            />
          </svg>
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
