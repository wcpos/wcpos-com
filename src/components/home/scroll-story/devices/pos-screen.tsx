import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

/**
 * Stylized SVG mockups of the WCPOS app, drawn from screenshots of
 * demo.wcpos.com/pos at desktop / tablet / phone sizes (2026-07-02).
 * Deliberately simplified — navy chrome, search + filter chips, product
 * grid, cart panel — enough to read as "that POS" without every button.
 * Vector, so the screens stay crisp under the story's CSS 3D transforms.
 */

const ink = {
  navy: '#24303f',
  navyDeep: '#1b2531',
  blue: '#2b6cb0',
  bg: '#e9eef3',
  card: '#ffffff',
  line: '#d8dfe7',
  strip: '#e2e8f0',
  text: '#1e293b',
  muted: '#7c8b9d',
  faint: '#a8b4c0',
  red: '#cd201f',
  green: '#34c759',
  pill: '#6b7a8c',
}

const swatches = ['#f2a08c', '#9ed3b6', '#cbb197', '#e3e7ec', '#b7cede', '#f5c6c1']

const demoProducts = [
  { id: 'p1', price: 29 },
  { id: 'p2', price: 24 },
  { id: 'p3', price: 18 },
  { id: 'p4', price: 9 },
  { id: 'p5', price: 14 },
  { id: 'p6', price: 16 },
] as const

const demoCart = [
  { id: 'c1', total: 24 },
  { id: 'c2', total: 36 },
  { id: 'c3', total: 9 },
] as const

export function formatUsdDemoAmount(
  locale: string,
  amount: number,
  options: Pick<
    Intl.NumberFormatOptions,
    'minimumFractionDigits' | 'maximumFractionDigits'
  > = {}
): string {
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'USD',
    ...options,
  }

  try {
    return new Intl.NumberFormat(locale, formatOptions).format(amount)
  } catch {
    return new Intl.NumberFormat('en', formatOptions).format(amount)
  }
}

function LandscapePos({
  w,
  h,
  register,
}: {
  w: number
  h: number
  register: number
}) {
  const t = useTranslations('home.story.pos')
  const locale = useLocale()
  const compactCurrency = (amount: number) =>
    formatUsdDemoAmount(locale, amount, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  const fullCurrency = (amount: number) =>
    formatUsdDemoAmount(locale, amount, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  const rail = 24
  const bar = 20
  const cartW = Math.round(w * 0.26)
  const cartX = w - cartW
  const gridX = rail + 7
  const gridY = 64
  const gridW = cartX - gridX - 7
  const statusH = 13
  const gridH = h - gridY - statusH - 6
  const cols = 3
  const gap = 6
  const cardW = (gridW - gap * (cols - 1)) / cols
  const cardH = (gridH - gap) / 2

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-full w-full"
      role="img"
      aria-label={t('aria.main')}
    >
      {/* content background */}
      <rect width={w} height={h} rx={6} fill={ink.bg} />

      {/* top bar */}
      <path d={`M0 6 Q0 0 6 0 H${w - 6} Q${w} 0 ${w} 6 V${bar} H0 Z`} fill={ink.navy} />
      <text
        x={w / 2}
        y={13.5}
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill="#ffffff"
      >
        {t('store')}
      </text>
      <circle cx={w - 34} cy={10} r={2.6} fill={ink.green} />
      <circle cx={w - 22} cy={10} r={5} fill="#41506270" stroke="#8ea0b5" strokeWidth="0.8" />
      <text x={w - 12} y={12.6} fontSize="6.5" fill="#c3cedb">
        {t('registerShort', { number: register })}
      </text>

      {/* left icon rail */}
      <path d={`M0 ${bar} H${rail} V${h - 6} Q${rail} ${h} ${rail - 6} ${h} H6 Q0 ${h} 0 ${h - 6} Z`} fill={ink.navyDeep} />
      <rect x={4} y={bar + 6} width={16} height={16} rx={4} fill={ink.blue} />
      <rect x={7.5} y={bar + 10} width={9} height={8} rx={1.5} fill="#fff" opacity="0.9" />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={7.5}
          y={bar + 32 + i * 15}
          width={9}
          height={9}
          rx={2}
          fill="#8ea0b5"
          opacity="0.55"
        />
      ))}

      {/* search + view toggles */}
      <rect x={gridX} y={27} width={gridW - 26} height={15} rx={5} fill={ink.card} stroke={ink.line} />
      <text x={gridX + 7} y={37} fontSize="6.5" fill={ink.faint}>
        {t('search')}
      </text>
      {[0, 1].map((i) => (
        <rect
          key={i}
          x={gridX + gridW - 22 + i * 12}
          y={30}
          width={9}
          height={9}
          rx={2}
          fill={ink.muted}
          opacity="0.5"
        />
      ))}

      {/* filter chips */}
      <rect x={gridX} y={48} width={46} height={11} rx={5.5} fill={ink.blue} />
      <text x={gridX + 7} y={55.8} fontSize="6" fontWeight="600" fill="#fff">
        {t('filters.stock')}
      </text>
      {(['featured', 'sale', 'category'] as const).map((label, i) => (
        <g key={label}>
          <rect
            x={gridX + 52 + i * 46}
            y={48}
            width={42}
            height={11}
            rx={5.5}
            fill={ink.card}
            stroke={ink.line}
          />
          <text
            x={gridX + 52 + i * 46 + 21}
            y={55.8}
            textAnchor="middle"
            fontSize="6"
            fill={ink.muted}
          >
            {t(`filters.${label}`)}
          </text>
        </g>
      ))}

      {/* product grid */}
      {demoProducts.map((product, i) => {
        const cx = gridX + (i % cols) * (cardW + gap)
        const cy = gridY + Math.floor(i / cols) * (cardH + gap)
        const imgH = cardH * 0.58
        return (
          <g key={product.id}>
            <rect x={cx} y={cy} width={cardW} height={cardH} rx={4} fill={ink.card} stroke={ink.line} />
            <path
              d={`M${cx} ${cy + 4} Q${cx} ${cy} ${cx + 4} ${cy} H${cx + cardW - 4} Q${cx + cardW} ${cy} ${cx + cardW} ${cy + 4} V${cy + imgH} H${cx} Z`}
              fill={swatches[i % swatches.length]}
              opacity="0.55"
            />
            {i % 3 === 1 && (
              <g>
                <rect x={cx + cardW - 30} y={cy + 3.5} width={27} height={9} rx={4.5} fill={ink.pill} />
                <text x={cx + cardW - 16.5} y={cy + 10} textAnchor="middle" fontSize="5.4" fill="#fff">
                  {t('variantBadge')}
                </text>
              </g>
            )}
            <text x={cx + 5} y={cy + imgH + 11} fontSize="6.5" fontWeight="700" fill={ink.text}>
              {t(`products.${product.id}`)}
            </text>
            <text x={cx + cardW - 5} y={cy + cardH - 5} textAnchor="end" fontSize="6.5" fill={ink.muted}>
              {compactCurrency(product.price)}
            </text>
          </g>
        )
      })}

      {/* status bar */}
      <rect x={rail} y={h - statusH} width={cartX - rail} height={statusH} fill={ink.strip} />
      <text x={gridX} y={h - 4.5} fontSize="5.5" fill={ink.muted}>
        {t('tax')}
      </text>
      <text x={cartX - 8} y={h - 4.5} textAnchor="end" fontSize="5.5" fill={ink.muted}>
        {t('showing', { shown: 16, total: 18 })}
      </text>

      {/* cart panel */}
      <path d={`M${cartX} ${bar} H${w} V${h - 6} Q${w} ${h} ${w - 6} ${h} H${cartX + 6} Q${cartX} ${h} ${cartX} ${h - 6} Z`} fill={ink.card} />
      <rect x={cartX} y={bar} width={cartW} height={16} fill={ink.strip} />
      <text x={cartX + 6} y={bar + 11} fontSize="6.5" fontWeight="600" fill={ink.text}>
        {t('customer')}
      </text>
      <rect x={cartX + 42} y={bar + 3} width={34} height={10.5} rx={5.25} fill={ink.blue} />
      <text x={cartX + 59} y={bar + 10.6} textAnchor="middle" fontSize="6" fill="#fff">
        {t('guest')}
      </text>
      {demoCart.map((line, i) => (
        <g key={line.id}>
          <text x={cartX + 8} y={bar + 34 + i * 15} fontSize="6.5" fill={ink.text}>
            {t(`cart.${line.id}`)}
          </text>
          <text x={w - 8} y={bar + 34 + i * 15} textAnchor="end" fontSize="6.5" fill={ink.text}>
            {compactCurrency(line.total)}
          </text>
          <line
            x1={cartX + 8}
            y1={bar + 39 + i * 15}
            x2={w - 8}
            y2={bar + 39 + i * 15}
            stroke={ink.line}
            strokeWidth="0.7"
          />
        </g>
      ))}
      <line x1={cartX + 8} y1={h - 40} x2={w - 8} y2={h - 40} stroke={ink.line} />
      <text x={cartX + 8} y={h - 31} fontSize="6" fill={ink.muted}>
        {t('subtotal')}
      </text>
      <text x={w - 8} y={h - 31} textAnchor="end" fontSize="6" fontWeight="700" fill={ink.text}>
        {fullCurrency(69)}
      </text>
      <rect x={cartX + 8} y={h - 25} width={cartW - 16} height={16} rx={4} fill={ink.red} />
      <text
        x={cartX + cartW / 2}
        y={h - 14}
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="700"
        fill="#fff"
      >
        {t('charge', { amount: compactCurrency(69) })}
      </text>
    </svg>
  )
}

function PhonePos() {
  const t = useTranslations('home.story.pos')
  const locale = useLocale()
  const compactCurrency = (amount: number) =>
    formatUsdDemoAmount(locale, amount, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  const w = 112
  const h = 242
  const cols = 2
  const gap = 5
  const gridX = 6
  const gridY = 56
  const navH = 22
  const cardW = (w - gridX * 2 - gap) / cols
  const cardH = 52
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-full w-full"
      role="img"
      aria-label={t('aria.phone')}
    >
      <rect width={w} height={h} rx={10} fill={ink.bg} />

      {/* top bar with hamburger */}
      <path d={`M0 10 Q0 0 10 0 H${w - 10} Q${w} 0 ${w} 10 V20 H0 Z`} fill={ink.navy} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={7} y={7.5 + i * 3} width={9} height={1.6} rx={0.8} fill="#c3cedb" />
      ))}
      <text x={24} y={13.5} fontSize="7.5" fontWeight="700" fill="#fff">
        POS
      </text>
      <circle cx={w - 10} cy={10} r={2.4} fill={ink.green} />

      {/* search + chips */}
      <rect x={6} y={25} width={w - 12} height={13} rx={4.5} fill={ink.card} stroke={ink.line} />
      <text x={11} y={33.8} fontSize="6" fill={ink.faint}>
        {t('search')}
      </text>
      <rect x={6} y={42} width={40} height={10} rx={5} fill={ink.blue} />
      <text x={12} y={49.2} fontSize="5.5" fontWeight="600" fill="#fff">
        {t('filters.stock')}
      </text>
      <rect x={50} y={42} width={34} height={10} rx={5} fill={ink.card} stroke={ink.line} />
      <text x={67} y={49.2} textAnchor="middle" fontSize="5.5" fill={ink.muted}>
        {t('filters.featured')}
      </text>

      {/* 2-col product grid */}
      {demoProducts.slice(0, 4).map((product, i) => {
        const cx = gridX + (i % cols) * (cardW + gap)
        const cy = gridY + Math.floor(i / cols) * (cardH + gap)
        const imgH = cardH * 0.55
        return (
          <g key={product.id}>
            <rect x={cx} y={cy} width={cardW} height={cardH} rx={3.5} fill={ink.card} stroke={ink.line} />
            <path
              d={`M${cx} ${cy + 3.5} Q${cx} ${cy} ${cx + 3.5} ${cy} H${cx + cardW - 3.5} Q${cx + cardW} ${cy} ${cx + cardW} ${cy + 3.5} V${cy + imgH} H${cx} Z`}
              fill={swatches[i % swatches.length]}
              opacity="0.55"
            />
            <text x={cx + 4} y={cy + imgH + 9} fontSize="5.8" fontWeight="700" fill={ink.text}>
              {t(`products.${product.id}`)}
            </text>
            <text x={cx + cardW - 4} y={cy + cardH - 4} textAnchor="end" fontSize="5.8" fill={ink.muted}>
              {compactCurrency(product.price)}
            </text>
          </g>
        )
      })}

      {/* charge bar + bottom nav */}
      <rect x={6} y={h - navH - 20} width={w - 12} height={15} rx={4} fill={ink.red} />
      <text x={w / 2} y={h - navH - 9.5} textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#fff">
        {t('charge', { amount: compactCurrency(69) })}
      </text>
      <path d={`M0 ${h - navH} H${w} V${h - 10} Q${w} ${h} ${w - 10} ${h} H10 Q0 ${h} 0 ${h - 10} Z`} fill={ink.card} />
      <line x1={0} y1={h - navH} x2={w} y2={h - navH} stroke={ink.line} />
      <rect x={22} y={h - 17.5} width={9} height={7} rx={1.5} fill={ink.blue} />
      <text x={26.5} y={h - 4.5} textAnchor="middle" fontSize="5.2" fontWeight="600" fill={ink.blue}>
        {t('tabs.products')}
      </text>
      <rect x={80} y={h - 17.5} width={9} height={7} rx={1.5} fill={ink.muted} opacity="0.6" />
      <circle cx={90.5} cy={h - 16.5} r={3.4} fill={ink.red} />
      <text x={90.5} y={h - 14.4} textAnchor="middle" fontSize="4.6" fontWeight="700" fill="#fff">
        3
      </text>
      <text x={84.5} y={h - 4.5} textAnchor="middle" fontSize="5.2" fill={ink.muted}>
        {t('tabs.cart')}
      </text>
    </svg>
  )
}

export function PosScreen({
  variant = 'tablet',
  registerNumber = 1,
  className,
}: {
  variant?: 'tablet' | 'laptop' | 'phone'
  registerNumber?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'h-full w-full overflow-hidden',
        variant === 'phone' ? 'rounded-[14px]' : 'rounded-lg',
        className
      )}
    >
      {variant === 'phone' ? (
        <PhonePos />
      ) : (
        <LandscapePos
          w={variant === 'tablet' ? 436 : 400}
          h={variant === 'tablet' ? 294 : 236}
          register={registerNumber}
        />
      )}
    </div>
  )
}
