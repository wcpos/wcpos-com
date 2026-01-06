export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">WooCommerce POS</h1>
        <p className="text-lg text-gray-600 mb-8">
          Point of Sale for WooCommerce
        </p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>Site under construction</p>
          <p>
            <a
              href="/api/health"
              className="text-blue-500 hover:underline"
            >
              API Health Check
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
