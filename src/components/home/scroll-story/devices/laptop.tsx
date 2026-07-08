import { cn } from '@/lib/utils'
import { PosScreen } from './pos-screen'
import styles from '../story.module.css'

export function DeviceLaptop({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('w-[420px]', className)}>
      <div className={cn('h-[250px] rounded-t-xl p-2.5 pb-1', styles.laptopLid)}>
        <PosScreen variant="laptop" registerNumber={2} />
      </div>
      <div className={cn('-mx-6 h-3.5 rounded-b-2xl', styles.laptopBase)}>
        <div className="mx-auto h-1.5 w-24 rounded-b-md bg-slate-800" />
      </div>
    </div>
  )
}
