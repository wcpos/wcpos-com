import { cn } from '@/lib/utils'
import styles from '../story.module.css'

/**
 * Act 1's top-down counter dressing: coffee props plus overhead views of the
 * hardware. Lives on its own layer so the choreography can slide the whole
 * counter away as the "camera" tilts up. Everything here is decorative and
 * exits before Act 2, so the top-down device geometry is local to this file.
 */
export function CounterProps({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('absolute inset-0', className)}>
      {/* napkin */}
      <div className="absolute left-[12%] top-[58%] h-[110px] w-[110px] rotate-[8deg] rounded-md bg-slate-50 shadow-[0_8px_16px_rgba(0,0,0,0.3)]" />

      {/* espresso cup + steam */}
      <div
        className={cn(
          'absolute bottom-[14%] right-[16%] h-[92px] w-[92px] rounded-full',
          styles.cup
        )}
      >
        <div className="absolute -right-5 top-7 h-[34px] w-[26px] rounded-full border-8 border-[#e7d6bc]" />
      </div>
      <span
        className={cn(
          'absolute bottom-[26%] right-[18.5%] h-12 w-[5px] rounded-full bg-white/55 blur-[5px]',
          styles.steam
        )}
      />
      <span
        className={cn(
          'absolute bottom-[27%] right-[17.5%] h-12 w-[5px] rounded-full bg-white/55 blur-[5px]',
          styles.steam
        )}
        style={{ animationDelay: '1.3s' }}
      />

      {/* scattered beans */}
      <span className="absolute left-[8%] top-[22%] h-[19px] w-[14px] rounded-full bg-[#4a2c17] shadow-[26px_10px_0_-2px_#3c2312,9px_30px_0_-4px_#56331c]" />

      {/* receipt printer, overhead */}
      <div className="absolute right-[22%] top-[14%] h-[112px] w-[150px] rotate-[5deg] rounded-2xl bg-slate-300 shadow-[0_18px_30px_-14px_rgba(0,0,0,0.5)]">
        <div
          className={cn(
            'absolute inset-x-[38px] -top-[58px] h-16 rounded-t bg-slate-50 shadow-[0_3px_8px_rgba(0,0,0,0.25)]',
            styles.paperPrint
          )}
        >
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="mx-2.5 mt-[7px] block h-[3px] rounded-sm bg-slate-300"
            />
          ))}
        </div>
        <div className="absolute inset-x-[18px] top-[18px] h-2.5 rounded-[5px] bg-slate-500" />
      </div>

      {/* barcode scanner, overhead */}
      <div className="absolute right-[8%] top-[40%] h-32 w-[60px] -rotate-[16deg] rounded-t-[28px] rounded-b-[14px] bg-slate-700 shadow-[0_14px_24px_-10px_rgba(0,0,0,0.55)]">
        <span
          className={cn(
            'absolute left-1/2 top-3.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-wcpos-red',
            styles.ledBlink
          )}
        />
      </div>

      {/* payment terminal, overhead */}
      <div className="absolute left-[16%] top-[16%] h-[138px] w-[92px] -rotate-[8deg] rounded-2xl border-[5px] border-slate-800 bg-slate-950 shadow-[0_18px_28px_-12px_rgba(0,0,0,0.55)]">
        <div
          className={cn(
            'absolute inset-x-2.5 top-2.5 h-[46px] rounded-md',
            styles.terminalScreen,
            styles.termGlow
          )}
        />
        <div className="absolute inset-x-2.5 bottom-2.5 top-[66px] grid grid-cols-3 gap-[5px]">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="rounded-[3px] bg-slate-700" />
          ))}
        </div>
      </div>
    </div>
  )
}
