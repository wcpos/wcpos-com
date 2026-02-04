import Link from 'next/link'

export function AccountHeader() {
  return (
    <header className="bg-white border-b">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            WCPOS
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">Account</span>
        </div>
        <p className="text-sm text-gray-500">Rebuilding with Medusa auth</p>
      </div>
    </header>
  )
}
