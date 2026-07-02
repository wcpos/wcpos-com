import { cn } from '@/lib/utils'
import styles from '../story.module.css'

/** Upright barcode scanner with a pulsing read beam. */
export function DeviceScanner({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('relative h-[190px] w-[120px]', className)}
    >
      <div className="absolute left-3.5 top-0 h-[74px] w-[92px] rounded-t-[18px] rounded-b-[24px] bg-slate-700 shadow-[0_24px_40px_-20px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)]" />
      <div
        className={cn(
          'absolute left-[30px] top-[76px] h-[3px] w-[60px] bg-wcpos-red blur-[1px]',
          styles.beamPulse
        )}
      />
      <div className="absolute left-[52px] top-20 h-[74px] w-4 bg-slate-600" />
      <div className="absolute bottom-0 left-[22px] h-[18px] w-[76px] rounded-[50%] bg-slate-700" />
    </div>
  )
}
