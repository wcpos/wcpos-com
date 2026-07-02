import { cn } from '@/lib/utils'
import styles from '../story.module.css'

/** Thermal receipt printer, front view, printing on loop. */
export function DevicePrinter({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative h-[148px] w-[210px] rounded-[18px]',
        styles.printerBody,
        className
      )}
    >
      <div
        className={cn(
          'absolute inset-x-[52px] bottom-[calc(100%-16px)] h-[92px] overflow-hidden rounded-t bg-slate-50',
          styles.receipt,
          styles.paperPrint
        )}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              'mx-2.5 mt-2 block h-[3px] rounded-sm bg-slate-300',
              i === 4 && 'w-2/5'
            )}
          />
        ))}
      </div>
      <div className="absolute inset-x-6 top-4 h-2 rounded bg-slate-600" />
      <div className="absolute bottom-4 left-6 h-2.5 w-8 rounded-md bg-slate-600" />
      <span
        className={cn(
          'absolute bottom-4 right-6 h-2 w-2 rounded-full bg-emerald-500',
          styles.ledBlink
        )}
      />
    </div>
  )
}
