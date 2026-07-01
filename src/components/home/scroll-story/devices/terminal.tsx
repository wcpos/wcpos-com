import { cn } from '@/lib/utils'
import styles from '../story.module.css'

/** Card payment terminal, front view, mid tap-to-pay. */
export function DeviceTerminal({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative h-[224px] w-[150px] rounded-[20px] border-[6px] border-slate-800',
        styles.terminalBody,
        className
      )}
    >
      <div
        className={cn(
          'absolute inset-x-3.5 top-3.5 flex h-[74px] flex-col items-center justify-center gap-1 rounded-lg',
          styles.terminalScreen,
          styles.termGlow
        )}
      >
        <span className="text-base font-bold text-white">$69.00</span>
        <span className="text-[8px] uppercase tracking-widest text-cyan-200">
          Tap to pay
        </span>
      </div>
      <div className="absolute right-3 top-3 h-4 w-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'absolute inset-0 rounded-full border-2 border-cyan-200 opacity-0',
              styles.wave
            )}
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}
      </div>
      <div className="absolute inset-x-3.5 bottom-3.5 top-[104px] grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }, (_, i) => (
          <span
            key={i}
            className={cn(
              'rounded',
              i === 8 ? 'bg-emerald-600' : 'bg-slate-700'
            )}
          />
        ))}
      </div>
    </div>
  )
}
