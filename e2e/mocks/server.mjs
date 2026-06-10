/**
 * E2E mock backend (Medusa + Keygen + GitHub).
 *
 * Started by Playwright (see playwright.config.ts webServer). The Next.js
 * server is launched with NODE_OPTIONS preloading ./fetch-intercept.cjs,
 * which rewrites outbound fetches to the real backends to this server, so
 * the default e2e suite needs NO external services.
 *
 * Personas are keyed by the fake `medusa-token` cookie value that specs set
 * (the app forwards the cookie value verbatim as a Bearer token).
 *
 * State isolation for mutating tests: a token of the form
 * `<persona>__<suffix>` lazily clones the persona's licenses/machines under
 * suffixed ids (`lic-e2e-active__<suffix>`), so parallel tests, projects and
 * retries never share mutable machine state.
 */
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixtures = JSON.parse(readFileSync(join(__dirname, 'fixtures.json'), 'utf8'))

const PORT = Number(process.env.E2E_MOCK_PORT || 4873)

// ---------------------------------------------------------------------------
// License instances (clone-on-first-use, keyed by possibly-suffixed id)
// ---------------------------------------------------------------------------

const licenseInstances = new Map()

function splitSuffix(value) {
  const index = value.indexOf('__')
  if (index === -1) return { base: value, suffix: null }
  return { base: value.slice(0, index), suffix: value.slice(index + 2) }
}

function getLicenseInstance(licenseId) {
  if (licenseInstances.has(licenseId)) return licenseInstances.get(licenseId)

  const { base, suffix } = splitSuffix(licenseId)
  const spec = fixtures.licenses[base]
  if (!spec) return null

  const instance = {
    id: licenseId,
    key: spec.key,
    status: spec.status,
    expiry: spec.expiry,
    maxMachines: spec.maxMachines,
    policyId: fixtures.policies[spec.policy] ?? spec.policy,
    created: spec.created,
    machines: (spec.machines ?? []).map((machine) => ({
      ...machine,
      id: suffix ? `${machine.id}__${suffix}` : machine.id,
    })),
  }
  licenseInstances.set(licenseId, instance)
  return instance
}

function licenseToJsonApi(instance) {
  return {
    type: 'licenses',
    id: instance.id,
    attributes: {
      key: instance.key,
      status: instance.status,
      expiry: instance.expiry,
      maxMachines: instance.maxMachines,
      metadata: {},
      created: instance.created,
    },
    relationships: {
      policy: { data: { type: 'policies', id: instance.policyId } },
    },
  }
}

function machineToJsonApi(machine) {
  return {
    type: 'machines',
    id: machine.id,
    attributes: {
      fingerprint: machine.fingerprint,
      name: machine.name ?? null,
      metadata: machine.metadata ?? {},
      created: machine.created,
    },
  }
}

// ---------------------------------------------------------------------------
// Personas (Medusa)
// ---------------------------------------------------------------------------

function personaForRequest(req) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
  if (!token) return null

  const { base, suffix } = splitSuffix(token)
  const persona = fixtures.personas[base]
  if (!persona) return null

  return { persona, suffix }
}

function ordersForPersona(persona, suffix) {
  return persona.orders.map((order) => {
    const clone = JSON.parse(JSON.stringify(order))
    if (suffix && Array.isArray(clone.metadata?.licenses)) {
      clone.metadata.licenses = clone.metadata.licenses.map((entry) => ({
        ...entry,
        ...(entry.license_id
          ? { license_id: `${entry.license_id}__${suffix}` }
          : {}),
      }))
    }
    return clone
  })
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

function readJson(req) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

const FAKE_ZIP = Buffer.from('PK e2e fake plugin zip payload')

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  const { pathname, searchParams } = url
  const method = req.method ?? 'GET'

  if (pathname === '/health') {
    return sendJson(res, 200, { status: 'ok' })
  }

  // ----- Medusa store API -----

  if (pathname === '/store/customers/me' && method === 'GET') {
    const auth = personaForRequest(req)
    if (!auth) return sendJson(res, 401, { message: 'Unauthorized' })
    return sendJson(res, 200, { customer: auth.persona.customer })
  }

  if (pathname === '/store/orders' && method === 'GET') {
    const auth = personaForRequest(req)
    if (!auth) return sendJson(res, 401, { message: 'Unauthorized' })

    const limit = Number(searchParams.get('limit') ?? 50)
    const offset = Number(searchParams.get('offset') ?? 0)
    const orders = ordersForPersona(auth.persona, auth.suffix)

    return sendJson(res, 200, {
      orders: orders.slice(offset, offset + limit),
      count: orders.length,
      limit,
      offset,
    })
  }

  if (pathname === '/store/products' && method === 'GET') {
    const handle = searchParams.get('handle')
    const products = handle
      ? fixtures.products.filter((product) => product.handle === handle)
      : fixtures.products
    return sendJson(res, 200, {
      products,
      count: products.length,
      limit: products.length,
      offset: 0,
    })
  }

  // ----- Keygen license API (JSON:API) -----

  if (pathname === '/v1/licenses/actions/validate-key' && method === 'POST') {
    const body = await readJson(req)
    const key = body?.meta?.key
    const licenseId = key ? fixtures.resolvableLicenseKeys[key] : undefined
    const instance = licenseId ? getLicenseInstance(licenseId) : null

    if (!instance) {
      return sendJson(res, 200, {
        meta: {
          valid: false,
          detail: 'license key was not found',
          code: 'NOT_FOUND',
        },
      })
    }

    const valid = instance.status === 'ACTIVE'
    return sendJson(res, 200, {
      meta: {
        valid,
        detail: valid ? 'is valid' : `is ${instance.status.toLowerCase()}`,
        code: valid ? 'VALID' : instance.status,
      },
      data: licenseToJsonApi(instance),
    })
  }

  const machinesMatch = pathname.match(/^\/v1\/licenses\/([^/]+)\/machines$/)
  if (machinesMatch) {
    const instance = getLicenseInstance(decodeURIComponent(machinesMatch[1]))
    if (!instance) {
      return sendJson(res, 404, { errors: [{ title: 'license not found' }] })
    }

    if (method === 'GET') {
      return sendJson(res, 200, { data: instance.machines.map(machineToJsonApi) })
    }

    if (method === 'POST') {
      const body = await readJson(req)
      const attributes = body?.data?.attributes ?? {}
      if (!attributes.fingerprint) {
        return sendJson(res, 400, { errors: [{ title: 'fingerprint is required' }] })
      }
      if (instance.machines.length >= instance.maxMachines) {
        return sendJson(res, 422, {
          errors: [{ title: 'machine count has exceeded maximum allowed by current policy' }],
        })
      }

      // Namespace new machine ids with the instance suffix so identical
      // fingerprints activated by parallel workers/projects never collide
      // (DELETE /v1/machines/{id} scans every instance, so ids must be
      // globally unique just like the cloned fixture machines above).
      const { suffix } = splitSuffix(instance.id)
      const machine = {
        id: suffix
          ? `mach-${attributes.fingerprint}__${suffix}`
          : `mach-${attributes.fingerprint}`,
        fingerprint: attributes.fingerprint,
        name: attributes.name ?? null,
        metadata: attributes.metadata ?? {},
        created: new Date().toISOString(),
      }
      instance.machines.push(machine)
      return sendJson(res, 201, { data: machineToJsonApi(machine) })
    }
  }

  const licenseMatch = pathname.match(/^\/v1\/licenses\/([^/]+)$/)
  if (licenseMatch && method === 'GET') {
    const instance = getLicenseInstance(decodeURIComponent(licenseMatch[1]))
    if (!instance) {
      return sendJson(res, 404, { errors: [{ title: 'license not found' }] })
    }
    return sendJson(res, 200, { data: licenseToJsonApi(instance) })
  }

  const machineMatch = pathname.match(/^\/v1\/machines\/([^/]+)$/)
  if (machineMatch && method === 'DELETE') {
    const machineId = decodeURIComponent(machineMatch[1])
    for (const instance of licenseInstances.values()) {
      const index = instance.machines.findIndex((machine) => machine.id === machineId)
      if (index !== -1) {
        instance.machines.splice(index, 1)
        res.writeHead(204)
        return res.end()
      }
    }
    return sendJson(res, 404, { errors: [{ title: 'machine not found' }] })
  }

  // ----- GitHub API -----

  if (pathname === '/repos/wcpos/woocommerce-pos-pro/releases' && method === 'GET') {
    // No Link header -> octokit.paginate stops after one page.
    return sendJson(res, 200, fixtures.releases)
  }

  if (
    method === 'GET' &&
    (pathname.startsWith('/repos/wcpos/woocommerce-pos-pro/releases/assets/') ||
      pathname.startsWith('/e2e-assets/'))
  ) {
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': FAKE_ZIP.length,
    })
    return res.end(FAKE_ZIP)
  }

  return sendJson(res, 404, { error: `No mock for ${method} ${pathname}` })
})

server.listen(PORT, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`[e2e-mock] listening on http://127.0.0.1:${PORT}`)
})
