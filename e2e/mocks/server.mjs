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
import {
  FAIL_COMPLETE_EMAIL_PREFIX,
  FAIL_SESSION_EMAIL_PREFIX,
  FIXTURE_PASSWORD,
  ORDER_PENDING_EMAIL_PREFIX,
  PURCHASE_LICENSE_ID,
  PURCHASE_LICENSE_KEY,
} from './constants.mjs'
import { randomUUID } from 'node:crypto'
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

// ---------------------------------------------------------------------------
// Dynamic personas — accounts created DURING a test run (inline checkout
// registration). Keyed by the minted token; carts/orders attach by email.
// ---------------------------------------------------------------------------

// Two token kinds mirror real Medusa emailpass semantics: the REGISTRATION
// token (issued before the customer exists, empty actor_id) may only create
// the customer; every persona read (/store/customers/me etc.) requires a
// SESSION token from a subsequent login. This is exactly the trap the app's
// register() must handle — a mock that accepted registration tokens as
// sessions let a real-world dead-session bug pass CI green.
const dynamicTokens = new Map() // token -> { persona, kind: 'registration' | 'session' }
const registeredCredentials = new Map() // email -> { password, persona }
let registrationSequence = 0

function fixtureTokenForEmail(email) {
  for (const [token, persona] of Object.entries(fixtures.personas)) {
    if (persona.customer?.email === email) return token
  }
  return null
}

function dynamicPersonaForEmail(email) {
  return registeredCredentials.get(email)?.persona ?? null
}

function bearerToken(req) {
  const auth = req.headers.authorization || ''
  return auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
}

function personaForRequest(req) {
  const token = bearerToken(req)
  if (!token) return null

  const dynamic = dynamicTokens.get(token)
  if (dynamic) {
    // Registration tokens are NOT sessions (empty actor_id in real Medusa).
    if (dynamic.kind !== 'session') return null
    return { persona: dynamic.persona, suffix: null }
  }

  const { base, suffix } = splitSuffix(token)
  const persona = fixtures.personas[base]
  if (!persona) return null

  return { persona, suffix }
}

// ---------------------------------------------------------------------------
// Carts & payment collections (Medusa v2 checkout)
// ---------------------------------------------------------------------------
//
// The app's cart calls (src/services/core/external/medusa-client.ts) carry no
// Authorization header — auth is enforced by the Next API routes via
// GET /store/customers/me — so cart state is keyed by a generated cart id
// rather than by persona. Every POST /store/carts mints a fresh id, so
// parallel workers/projects/retries never share mutable cart state (the same
// isolation property the persona `__<suffix>` convention provides above).

const carts = new Map()
const paymentCollections = new Map()
let cartSequence = 0

function findVariant(variantId) {
  for (const product of fixtures.products) {
    const variant = product.variants.find((entry) => entry.id === variantId)
    if (variant) return { product, variant }
  }
  return null
}

function recalculateCart(cart) {
  cart.subtotal = cart.items.reduce((sum, item) => sum + item.total, 0)
  cart.total = cart.subtotal + cart.tax_total
}

let orderSequence = 0

/**
 * Turn a cart into an order the way the real backend does at completion:
 * mint the order, mark the collection paid, stamp license metadata (the
 * Medusa→Keygen webhook's job in production, reusing the resolvable
 * `lic-e2e-purchase` fixture so /account/licenses can hydrate it), and
 * attach the order to the purchasing persona by cart email so account
 * pages show the purchase.
 */
function completeCartIntoOrder(cart) {
  orderSequence += 1
  const order = {
    id: `order_e2e_new_${orderSequence}_${randomUUID().slice(0, 8)}`,
    display_id: 90000 + orderSequence,
    status: 'completed',
    email: cart.email,
    currency_code: cart.currency_code,
    created_at: new Date().toISOString(),
    items: cart.items.map((item) => ({ ...item })),
    subtotal: cart.subtotal,
    tax_total: cart.tax_total,
    total: cart.total,
    ...(cart.billing_address
      ? { billing_address: { ...cart.billing_address } }
      : {}),
    metadata: {
      licenses: [
        {
          license_id: PURCHASE_LICENSE_ID,
          license_key: PURCHASE_LICENSE_KEY,
        },
      ],
    },
  }

  if (cart.payment_collection) {
    cart.payment_collection.status = 'authorized'
    for (const session of cart.payment_collection.payment_sessions) {
      session.status = 'authorized'
    }
  }
  cart.completed_at = order.created_at
  cart.order_id = order.id
  cart.order = order

  const persona = cart.email ? dynamicPersonaForEmail(cart.email) : null
  if (persona) {
    persona.orders.unshift(order)
  }

  return order
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

  // ----- Medusa auth API (emailpass register / login) -----

  if (pathname === '/auth/customer/emailpass/register' && method === 'POST') {
    const body = await readJson(req)
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password) {
      return sendJson(res, 400, { message: 'Email and password are required' })
    }
    if (registeredCredentials.has(email) || fixtureTokenForEmail(email)) {
      // Matches Medusa's duplicate-identity message shape, which the app's
      // adapter classifies into AccountExistsError (409 ACCOUNT_EXISTS).
      return sendJson(res, 401, {
        message: 'Identity with email already exists',
      })
    }
    registrationSequence += 1
    const token = `e2e-reg-${registrationSequence}-${randomUUID().slice(0, 8)}`
    const persona = { customer: null, orders: [], licenses: {} }
    registeredCredentials.set(email, { password, persona })
    dynamicTokens.set(token, { persona, kind: 'registration' })
    return sendJson(res, 200, { token })
  }

  if (pathname === '/auth/customer/emailpass' && method === 'POST') {
    const body = await readJson(req)
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    const registered = registeredCredentials.get(email)
    if (registered && registered.password === password) {
      const sessionToken = `e2e-sess-${randomUUID().slice(0, 12)}`
      dynamicTokens.set(sessionToken, {
        persona: registered.persona,
        kind: 'session',
      })
      return sendJson(res, 200, { token: sessionToken })
    }
    const fixtureToken = fixtureTokenForEmail(email)
    if (fixtureToken && password === FIXTURE_PASSWORD) {
      return sendJson(res, 200, { token: fixtureToken })
    }
    return sendJson(res, 401, { message: 'Invalid email or password' })
  }

  if (pathname === '/store/customers' && method === 'POST') {
    // Customer creation is the ONE call a registration token may make
    // (real Medusa: authenticate(..., { allowUnregistered: true })).
    const entry = dynamicTokens.get(bearerToken(req))
    if (!entry) return sendJson(res, 401, { message: 'Unauthorized' })
    const body = await readJson(req)
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!email) return sendJson(res, 400, { message: 'Email is required' })
    if (entry.persona.customer) {
      return sendJson(res, 400, {
        message: 'Customer already exists for this identity',
      })
    }
    entry.persona.customer = {
      id: `cus_e2e_${randomUUID().slice(0, 8)}`,
      email,
      first_name: body.first_name ?? null,
      last_name: body.last_name ?? null,
      created_at: new Date().toISOString(),
    }
    return sendJson(res, 200, { customer: entry.persona.customer })
  }

  // ----- Medusa store API -----

  if (pathname === '/store/customers/me' && method === 'GET') {
    const auth = personaForRequest(req)
    if (!auth) return sendJson(res, 401, { message: 'Unauthorized' })
    return sendJson(res, 200, { customer: auth.persona.customer })
  }

  // Customer addresses — the billing source of truth. Create and update
  // mirror real Medusa: both respond with the refetched parent customer.
  const addressUpdateMatch = pathname.match(
    /^\/store\/customers\/me\/addresses(?:\/([^/]+))?$/
  )
  if (addressUpdateMatch && method === 'POST') {
    const auth = personaForRequest(req)
    if (!auth) return sendJson(res, 401, { message: 'Unauthorized' })
    const body = await readJson(req)
    const customer = auth.persona.customer
    customer.addresses ??= []
    const addressId = addressUpdateMatch[1]
    if (addressId) {
      const address = customer.addresses.find((a) => a.id === addressId)
      if (!address) {
        return sendJson(res, 404, { message: `Address ${addressId} not found` })
      }
      Object.assign(address, body)
    } else {
      if (body.is_default_billing) {
        for (const address of customer.addresses) {
          address.is_default_billing = false
        }
      }
      customer.addresses.push({
        id: `cuaddr_e2e_${randomUUID().slice(0, 8)}`,
        ...body,
      })
    }
    return sendJson(res, 200, { customer })
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

  // ----- Medusa carts & payment collections (checkout) -----

  if (pathname === '/store/carts' && method === 'POST') {
    const body = await readJson(req)
    cartSequence += 1
    const id = `cart_e2e_${cartSequence}_${randomUUID().slice(0, 8)}`
    const cart = {
      id,
      email: typeof body.email === 'string' ? body.email : null,
      region_id: 'reg_e2e',
      currency_code: 'usd',
      items: [],
      subtotal: 0,
      tax_total: 0,
      total: 0,
      metadata: body.metadata ?? {},
    }
    carts.set(id, cart)
    return sendJson(res, 200, { cart })
  }

  const cartLineItemsMatch = pathname.match(/^\/store\/carts\/([^/]+)\/line-items$/)
  if (cartLineItemsMatch && method === 'POST') {
    const cart = carts.get(decodeURIComponent(cartLineItemsMatch[1]))
    if (!cart) return sendJson(res, 404, { message: 'Cart not found' })

    const body = await readJson(req)
    const match = body.variant_id ? findVariant(body.variant_id) : null
    if (!match) {
      return sendJson(res, 400, {
        message: `Variant not found: ${body.variant_id}`,
      })
    }

    const quantityCandidate = Number(body.quantity ?? 1)
    if (
      Number.isNaN(quantityCandidate) ||
      !Number.isInteger(quantityCandidate) ||
      quantityCandidate <= 0
    ) {
      return sendJson(res, 400, {
        message: 'Quantity must be a positive integer',
      })
    }
    const quantity = quantityCandidate
    const unitPrice =
      match.variant.prices.find((price) => price.currency_code === 'usd')
        ?.amount ?? 0
    cart.items.push({
      id: `item_${cart.id}_${cart.items.length + 1}`,
      title: match.product.title,
      description: match.variant.title,
      quantity,
      unit_price: unitPrice,
      subtotal: unitPrice * quantity,
      total: unitPrice * quantity,
      variant_id: match.variant.id,
    })
    recalculateCart(cart)
    return sendJson(res, 200, { cart })
  }

  const cartMatch = pathname.match(/^\/store\/carts\/([^/]+)$/)
  if (cartMatch && (method === 'GET' || method === 'POST')) {
    const cart = carts.get(decodeURIComponent(cartMatch[1]))
    if (!cart) return sendJson(res, 404, { message: 'Cart not found' })

    if (method === 'POST') {
      // Medusa v2 updates carts via POST /store/carts/{id}
      // (email, metadata, billing_address).
      const body = await readJson(req)
      if (typeof body.email === 'string') cart.email = body.email
      if (body.metadata && typeof body.metadata === 'object') {
        cart.metadata = { ...cart.metadata, ...body.metadata }
      }
      if (body.billing_address && typeof body.billing_address === 'object') {
        cart.billing_address = { ...body.billing_address }
      }
    }
    return sendJson(res, 200, { cart })
  }

  if (pathname === '/store/payment-collections' && method === 'POST') {
    const body = await readJson(req)
    const cart = carts.get(typeof body.cart_id === 'string' ? body.cart_id : '')
    if (!cart) return sendJson(res, 404, { message: 'Cart not found' })

    // Failure injection: carts whose email starts with `fail-session+` cannot
    // initialize payment (exercises the payment-init error path).
    if ((cart.email ?? '').startsWith(FAIL_SESSION_EMAIL_PREFIX)) {
      return sendJson(res, 500, { message: 'Payment provider unavailable' })
    }

    const collectionId = `paycol_${cart.id}`
    const existing = paymentCollections.get(collectionId)
    if (existing) {
      existing.amount = cart.total
      existing.currency_code = cart.currency_code
      cart.payment_collection = existing
      return sendJson(res, 200, { payment_collection: existing })
    }

    const collection = {
      id: collectionId,
      currency_code: cart.currency_code,
      amount: cart.total,
      status: 'not_paid',
      payment_sessions: [],
    }
    paymentCollections.set(collection.id, collection)
    // Stored by reference so GET /store/carts/{id} reflects later sessions.
    cart.payment_collection = collection
    return sendJson(res, 200, { payment_collection: collection })
  }

  const paymentSessionsMatch = pathname.match(
    /^\/store\/payment-collections\/([^/]+)\/payment-sessions$/
  )
  if (paymentSessionsMatch && method === 'POST') {
    const collection = paymentCollections.get(
      decodeURIComponent(paymentSessionsMatch[1])
    )
    if (!collection) {
      return sendJson(res, 404, { message: 'Payment collection not found' })
    }

    const body = await readJson(req)
    const providerId =
      typeof body.provider_id === 'string' ? body.provider_id : 'pp_stripe_stripe'
    let session = collection.payment_sessions.find(
      (entry) => entry.provider_id === providerId
    )
    if (!session) {
      session = {
        id: `payses_${collection.id}_${providerId}`,
        provider_id: providerId,
        status: 'pending',
        // Shaped like a Stripe PaymentIntent client secret; the mocked suite
        // never mounts Stripe Elements (no NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        // at build time), so this is only ever read, not used.
        data:
          providerId === 'pp_stripe_stripe'
            ? { client_secret: `pi_e2e_${collection.id}_secret_e2e` }
            : providerId === 'pp_btcpay_btcpay'
              ? {
                  // Points at this mock's own BTCPay simulator so the mocked
                  // suite can exercise the full redirect → pay → return loop.
                  checkoutLink: `http://127.0.0.1:${PORT}/btcpay/checkout/${collection.id}`,
                }
              : providerId === 'pp_paypal_paypal'
                ? { id: `paypal_order_${collection.id}` }
                : {},
      }
      collection.payment_sessions.push(session)
    }
    return sendJson(res, 200, { payment_collection: collection })
  }

  // ----- Medusa cart completion (order + license issuance) -----

  const cartCompleteMatch = pathname.match(
    /^\/store\/carts\/([^/]+)\/complete$/
  )
  if (cartCompleteMatch && method === 'POST') {
    const cart = carts.get(decodeURIComponent(cartCompleteMatch[1]))
    if (!cart) return sendJson(res, 404, { message: 'Cart not found' })

    const email = cart.email ?? ''

    // Failure injections keyed by the cart email local-part prefix:
    //   fail-complete+…   -> hard 500 (payment NOT taken; retryable failure)
    //   order-pending+…   -> 200 without an order (payment taken, order stuck
    //                        — the state the checkout-safety machinery guards)
    if (email.startsWith(FAIL_COMPLETE_EMAIL_PREFIX)) {
      return sendJson(res, 500, { message: 'Cart completion failed' })
    }
    if (email.startsWith(ORDER_PENDING_EMAIL_PREFIX)) {
      return sendJson(res, 200, { type: 'cart', cart })
    }

    if (!cart.payment_collection?.payment_sessions?.length) {
      return sendJson(res, 400, {
        message: 'Cart has no payment session',
      })
    }
    if (cart.items.length === 0) {
      return sendJson(res, 400, { message: 'Cart is empty' })
    }

    if (cart.order_id) {
      const existingOrder =
        cart.order ??
        dynamicPersonaForEmail(email)?.orders.find(
          (order) => order.id === cart.order_id
        )
      if (existingOrder) {
        return sendJson(res, 200, { type: 'order', order: existingOrder })
      }
      return sendJson(res, 409, {
        message: 'Cart is already completed',
        order_id: cart.order_id,
      })
    }

    const order = completeCartIntoOrder(cart)
    return sendJson(res, 200, { type: 'order', order })
  }

  // ----- BTCPay simulator (checkout link target for pp_btcpay_btcpay) -----

  const btcpayCheckoutMatch = pathname.match(/^\/btcpay\/checkout\/([^/]+)$/)
  if (btcpayCheckoutMatch && method === 'GET') {
    const collectionId = decodeURIComponent(btcpayCheckoutMatch[1])
    const html = `<!doctype html><html><body>
      <h1>BTCPay Invoice (e2e simulator)</h1>
      <p data-testid="btcpay-invoice">Invoice for ${collectionId}</p>
      <a data-testid="btcpay-pay" href="/btcpay/pay/${encodeURIComponent(collectionId)}">Simulate payment</a>
    </body></html>`
    res.writeHead(200, { 'Content-Type': 'text/html' })
    return res.end(html)
  }

  const btcpayPayMatch = pathname.match(/^\/btcpay\/pay\/([^/]+)$/)
  if (btcpayPayMatch && method === 'GET') {
    const collectionId = decodeURIComponent(btcpayPayMatch[1])
    // Collection ids embed the cart id: paycol_<cartId>.
    const cartId = collectionId.replace(/^paycol_/, '')
    const cart = carts.get(cartId)
    if (!cart) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      return res.end('Unknown invoice')
    }
    // "Webhook" side effect: settle the invoice and complete the order the
    // way the production Medusa BTCPay plugin does, then send the customer
    // back to the store's success page.
    if (!cart.order_id) {
      completeCartIntoOrder(cart)
    }
    res.writeHead(302, {
      Location: 'http://localhost:3000/pro/checkout/success',
    })
    return res.end()
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

  if (pathname === '/repos/wcpos/woocommerce-pos/releases' && method === 'GET') {
    // No Link header -> octokit.paginate stops after one page.
    return sendJson(res, 200, fixtures.freeReleases)
  }

  // Fetched by /api/desktop-releases (prerendered at build time), so this is
  // hit during `pnpm build` and on cache revalidation, not just by specs.
  if (pathname === '/repos/wcpos/electron/releases/latest' && method === 'GET') {
    return sendJson(res, 200, fixtures.electronLatestRelease)
  }

  if (
    method === 'GET' &&
    (pathname.startsWith('/repos/wcpos/woocommerce-pos-pro/releases/assets/') ||
      pathname.startsWith('/repos/wcpos/electron/releases/assets/') ||
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
  console.log(`[e2e-mock] listening on http://127.0.0.1:${PORT}`)
})
