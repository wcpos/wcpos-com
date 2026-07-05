import { getImpersonation } from '@/lib/impersonation'
import { getCustomer } from '@/lib/medusa-auth'

/**
 * Shown across the whole account area while inspecting. `getCustomer()` here is
 * the TARGET (impersonation is active), so its email is the inspected account.
 */
export async function ImpersonationBanner() {
  const impersonation = await getImpersonation()
  if (!impersonation) return null
  const target = await getCustomer()

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-500 px-4 py-2 text-sm text-black">
      <span>
        🔍 Viewing <strong>{target?.email ?? impersonation.targetId}</strong> as{' '}
        <strong>read-only</strong> — you cannot change their account.
      </span>
      <form action="/api/account/impersonate/exit" method="post">
        <button
          type="submit"
          className="rounded bg-black/80 px-3 py-1 text-white hover:bg-black"
        >
          Exit
        </button>
      </form>
    </div>
  )
}
