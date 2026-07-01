/**
 * PROTOTYPE — throwaway code, do not ship.
 * Toggles ?signedin= so both auth states of each checkout variant can be
 * previewed. Lives inside the floating switcher bar.
 */
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function SignedInToggle({ signedIn }: { signedIn: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function toggle() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('signedin', signedIn ? '0' : '1')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`rounded-full border px-2 py-0.5 text-xs ${
        signedIn
          ? 'border-green-400 text-green-300'
          : 'border-zinc-600 text-zinc-400'
      }`}
    >
      {signedIn ? 'signed in' : 'signed out'}
    </button>
  )
}
