// PROTOTYPE — throwaway. Shared platform-detection hook for the /downloads
// hero variants. Delete along with the rest of hero-prototype/.
'use client'

import { useSyncExternalStore } from 'react'
import {
  resolvePlatform,
  type PlatformKey,
} from '@/components/downloads/download-picker'

/** Platform never changes within a session, so the store never emits. */
const subscribe = () => () => {}

export function useDetectedPlatform(): PlatformKey {
  return useSyncExternalStore<PlatformKey>(
    subscribe,
    () =>
      resolvePlatform(
        navigator.userAgent,
        navigator.platform,
        navigator.maxTouchPoints ?? 0,
      ),
    () => 'mac-arm',
  )
}
