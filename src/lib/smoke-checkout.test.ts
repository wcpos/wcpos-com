import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:http'

import { describe, expect, it } from 'vitest'

async function runSmokeCheckout(html: string) {
  const server = createServer((_, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(html)
  })

  server.listen(0, '127.0.0.1')
  await once(server, 'listening')

  const address = server.address()
  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('Failed to bind smoke checkout test server')
  }

  const child = spawn(process.execPath, ['scripts/smoke-checkout.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CHECKOUT_URL: `http://127.0.0.1:${address.port}/pro/checkout`,
    },
  })

  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => {
    stdout += chunk
  })
  child.stderr.on('data', (chunk) => {
    stderr += chunk
  })

  const [status] = (await once(child, 'close')) as [number]
  server.close()

  return { status, stdout, stderr }
}

describe('smoke checkout monitor', () => {
  it('accepts Stripe publishable keys serialized in escaped Flight strings', async () => {
    const result = await runSmokeCheckout(
      '<script>self.__next_f.push([1,"{\\"stripePublishableKey\\":\\"pk_live_1234567890\\"}"])</script>'
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('checkout smoke passed')
  })

  it('reports a missing Stripe key marker separately from a broken key', async () => {
    const result = await runSmokeCheckout('<html><body>checkout</body></html>')

    expect(result.status).toBe(3)
    expect(result.stderr).toContain('stripePublishableKey marker not found')
  })
})
