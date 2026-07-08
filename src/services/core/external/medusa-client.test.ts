import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only (this module prevents client-side imports)
vi.mock('server-only', () => ({}))

// Mock environment variables
vi.mock('@/utils/env', () => ({
  env: {
    MEDUSA_BACKEND_URL: 'https://test-store-api.wcpos.com',
    MEDUSA_PUBLISHABLE_KEY: 'pk_test_123',
  },
}))

// Mock the host-keyed store environment (replaces the old env-var mock):
// unit tests always see the pinned test backend.
vi.mock('@/lib/store-environment', () => {
  const environment = {
    name: 'test',
    medusaBackendUrl: 'https://test-store-api.wcpos.com',
    medusaPublishableKey: 'pk_test_abc123',
    payments: {
      stripePublishableKey: null,
      paypal: null,
      btcpayEnabled: true,
    },
  }
  return {
    getRequestStoreEnvironment: vi.fn(async () => environment),
    getLiveStoreEnvironment: vi.fn(() => environment),
    getStoreEnvironmentByName: vi.fn(() => environment),
    getMedusaBackendUrl: vi.fn(async () => environment.medusaBackendUrl),
    getMedusaPublishableKey: vi.fn(
      async () => environment.medusaPublishableKey
    ),
  }
})

// Import after mocks are set up
import {
  getProducts,
  getWcposProProducts,
  getProductByHandle,
  getProductById,
  getRegions,
  getCartPaymentProviderContext,
  getEnabledPaymentProviderIds,
  formatPrice,
  getVariantPrice,
  createCart,
  getCart,
  addLineItem,
  updateCart,
  createPaymentCollection,
  createPaymentSession,
  createCustomerSession,
  capturePayPalOrder,
  completeCart,
} from './medusa-client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Sample mock data
const mockProduct = {
  id: 'prod_123',
  title: 'WCPOS Pro Yearly',
  handle: 'wcpos-pro-yearly',
  description: 'Annual subscription',
  status: 'published',
  thumbnail: null,
  images: [],
  variants: [
    {
      id: 'variant_123',
      title: 'Yearly Subscription',
      sku: 'WCPOS-PRO-YEARLY',
      prices: [
        { id: 'price_1', currency_code: 'usd', amount: 129 },
        { id: 'price_2', currency_code: 'eur', amount: 119 },
      ],
      options: {},
      manage_inventory: false,
    },
  ],
  options: [],
  metadata: { license_type: 'subscription' },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockLifetimeProduct = {
  ...mockProduct,
  id: 'prod_456',
  title: 'WCPOS Pro Lifetime',
  handle: 'wcpos-pro-lifetime',
  variants: [
    {
      id: 'variant_456',
      title: 'Lifetime License',
      sku: 'WCPOS-PRO-LIFETIME',
      prices: [
        { id: 'price_3', currency_code: 'usd', amount: 399 },
        { id: 'price_4', currency_code: 'eur', amount: 369 },
      ],
      options: {},
      manage_inventory: false,
    },
  ],
}

const mockCart = {
  id: 'cart_123',
  email: null,
  region_id: 'reg_123',
  currency_code: 'usd',
  items: [],
  subtotal: 0,
  tax_total: 0,
  total: 0,
}

describe('medusaClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProducts', () => {
    it('fetches and returns all products', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [mockProduct, mockLifetimeProduct],
          count: 2,
          offset: 0,
          limit: 20,
        }),
      })

      const products = await getProducts()

      expect(products).toHaveLength(2)
      expect(products[0].title).toBe('WCPOS Pro Yearly')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-store-api.wcpos.com/store/products?fields=*variants.prices',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-publishable-api-key': 'pk_test_abc123',
          }),
        })
      )
    })

    it('returns empty array on fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      const products = await getProducts()

      expect(products).toEqual([])
    })

    it('returns empty array when API rejects missing publishable key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () =>
          '{"type":"not_allowed","message":"A valid publishable key is required"}',
      })

      const products = await getProducts()

      expect(products).toEqual([])
    })

  })

  describe('getWcposProProducts', () => {
    it('filters products to only registered Pro plan handles', async () => {
      const otherProduct = { ...mockProduct, id: 'prod_other', handle: 'other-product' }
      const unregisteredProProduct = {
        ...mockProduct,
        id: 'prod_monthly',
        handle: 'wcpos-pro-monthly',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [mockProduct, mockLifetimeProduct, unregisteredProProduct, otherProduct],
        }),
      })

      const products = await getWcposProProducts()

      expect(products).toHaveLength(2)
      expect(products.map((p) => p.handle)).toEqual([
        'wcpos-pro-yearly',
        'wcpos-pro-lifetime',
      ])
    })
  })

  describe('getProductByHandle', () => {
    it('fetches a single product by handle', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [mockProduct] }),
      })

      const product = await getProductByHandle('wcpos-pro-yearly')

      expect(product).not.toBeNull()
      expect(product?.handle).toBe('wcpos-pro-yearly')
    })

    it('returns null if product not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      })

      const product = await getProductByHandle('nonexistent')

      expect(product).toBeNull()
    })
  })

  describe('getProductById', () => {
    it('fetches a single product by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ product: mockProduct }),
      })

      const product = await getProductById('prod_123')

      expect(product).not.toBeNull()
      expect(product?.id).toBe('prod_123')
    })
  })

  describe('getRegions', () => {
    it('fetches available regions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          regions: [
            { id: 'reg_1', name: 'US', currency_code: 'usd', countries: [] },
          ],
        }),
      })

      const regions = await getRegions()

      expect(regions).toHaveLength(1)
      expect(regions[0].name).toBe('US')
    })
  })

  describe('getEnabledPaymentProviderIds', () => {
    it('returns the provider-filter region id for explicit cart creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          regions: [
            {
              id: 'reg_eu',
              name: 'EU',
              payment_providers: [
                { id: 'pp_stripe_stripe', is_enabled: true },
              ],
            },
            {
              id: 'reg_us',
              name: 'US',
              payment_providers: [
                { id: 'pp_btcpay_btcpay', is_enabled: true },
              ],
            },
          ],
        }),
      })

      await expect(getCartPaymentProviderContext()).resolves.toEqual({
        cartRegionId: 'reg_eu',
        providerIds: ['pp_stripe_stripe'],
      })
    })

    it('selects the USD region even when Medusa lists another region first', async () => {
      // The store advertises USD prices, so the cart must resolve to the USD
      // region regardless of region ordering (Medusa may return EUR first).
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          regions: [
            {
              id: 'reg_eu',
              name: 'Europe',
              currency_code: 'eur',
              payment_providers: [
                { id: 'pp_stripe-ideal_stripe', is_enabled: true },
              ],
            },
            {
              id: 'reg_us',
              name: 'Worldwide',
              currency_code: 'usd',
              payment_providers: [
                { id: 'pp_stripe_stripe', is_enabled: true },
              ],
            },
          ],
        }),
      })

      await expect(getCartPaymentProviderContext()).resolves.toEqual({
        cartRegionId: 'reg_us',
        providerIds: ['pp_stripe_stripe'],
      })
    })

    it('falls back to the first region when no USD region exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          regions: [
            {
              id: 'reg_eu',
              name: 'Europe',
              currency_code: 'eur',
              payment_providers: [
                { id: 'pp_stripe_stripe', is_enabled: true },
              ],
            },
            {
              id: 'reg_gbp',
              name: 'UK',
              currency_code: 'gbp',
              payment_providers: [
                { id: 'pp_paypal_paypal', is_enabled: true },
              ],
            },
          ],
        }),
      })

      await expect(getCartPaymentProviderContext()).resolves.toEqual({
        cartRegionId: 'reg_eu',
        providerIds: ['pp_stripe_stripe'],
      })
    })

    it('matches the USD region case-insensitively', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          regions: [
            {
              id: 'reg_eu',
              name: 'Europe',
              currency_code: 'eur',
              payment_providers: [
                { id: 'pp_stripe-ideal_stripe', is_enabled: true },
              ],
            },
            {
              id: 'reg_us',
              name: 'Worldwide',
              currency_code: 'USD',
              payment_providers: [
                { id: 'pp_stripe_stripe', is_enabled: true },
              ],
            },
          ],
        }),
      })

      await expect(getCartPaymentProviderContext()).resolves.toEqual({
        cartRegionId: 'reg_us',
        providerIds: ['pp_stripe_stripe'],
      })
    })

    it('uses the explicit cart region instead of unioning every region', async () => {
      // Single request: the old multi-region branch asked /store/store for a
      // default region — an endpoint that does not exist (404) — so the
      // filter failed open on every real multi-region backend.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          regions: [
            {
              id: 'reg_eu',
              name: 'EU',
              payment_providers: [
                { id: 'pp_stripe_stripe', is_enabled: true },
                { id: 'pp_paypal_paypal', is_enabled: true },
              ],
            },
            {
              id: 'reg_us',
              name: 'US',
              payment_providers: [
                { id: 'pp_btcpay_btcpay', is_enabled: true },
              ],
            },
          ],
        }),
      })

      await expect(getEnabledPaymentProviderIds()).resolves.toEqual([
        'pp_stripe_stripe',
        'pp_paypal_paypal',
      ])
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('excludes providers the region reports as disabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          regions: [
            {
              id: 'reg_eu',
              name: 'EU',
              payment_providers: [
                { id: 'pp_stripe_stripe', is_enabled: true },
                { id: 'pp_btcpay_btcpay', is_enabled: false },
              ],
            },
          ],
        }),
      })

      await expect(getEnabledPaymentProviderIds()).resolves.toEqual([
        'pp_stripe_stripe',
      ])
    })

    it('fails open when no region reports any providers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          regions: [
            { id: 'reg_eu', name: 'EU', payment_providers: [] },
            { id: 'reg_us', name: 'US' },
          ],
        }),
      })

      await expect(getEnabledPaymentProviderIds()).resolves.toBeNull()
    })

    it('filters everything when one region has no providers but another does', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          regions: [
            { id: 'reg_eu', name: 'EU', payment_providers: [] },
            {
              id: 'reg_us',
              name: 'US',
              payment_providers: [
                { id: 'pp_stripe_stripe', is_enabled: true },
              ],
            },
          ],
        }),
      })

      await expect(getEnabledPaymentProviderIds()).resolves.toEqual([])
    })

    it('fails open when the regions request errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'boom',
      })

      await expect(getEnabledPaymentProviderIds()).resolves.toBeNull()
    })
  })

  describe('formatPrice', () => {
    it('formats USD correctly', () => {
      expect(formatPrice(129, 'usd')).toBe('$129.00')
    })

    it('formats EUR correctly', () => {
      expect(formatPrice(119, 'eur')).toBe('€119.00')
    })
  })

  describe('getVariantPrice', () => {
    it('returns price for specified currency', () => {
      const variant = mockProduct.variants[0]
      expect(getVariantPrice(variant, 'usd')).toBe(129)
      expect(getVariantPrice(variant, 'eur')).toBe(119)
    })

    it('returns null for unavailable currency', () => {
      const variant = mockProduct.variants[0]
      expect(getVariantPrice(variant, 'gbp')).toBeNull()
    })

    it('is case-insensitive', () => {
      const variant = mockProduct.variants[0]
      expect(getVariantPrice(variant, 'USD')).toBe(129)
    })
  })

  describe('Cart Management', () => {
    describe('createCart', () => {
      it('creates a new cart', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ cart: mockCart }),
        })

        const cart = await createCart({})

        expect(cart).not.toBeNull()
        expect(cart?.id).toBe('cart_123')
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test-store-api.wcpos.com/store/carts',
          expect.objectContaining({
            method: 'POST',
          })
        )
      })
    })

    describe('getCart', () => {
      it('fetches a cart by ID', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ cart: mockCart }),
        })

        const cart = await getCart('cart_123')

        expect(cart?.id).toBe('cart_123')
      })
    })

    describe('addLineItem', () => {
      it('adds an item to cart', async () => {
        const cartWithItem = {
          ...mockCart,
          items: [{ id: 'item_1', variant_id: 'variant_123', quantity: 1 }],
        }
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ cart: cartWithItem }),
        })

        const cart = await addLineItem('cart_123', {
          variant_id: 'variant_123',
          quantity: 1,
        })

        expect(cart?.items).toHaveLength(1)
      })
    })

    describe('updateCart', () => {
      it('updates cart with email', async () => {
        const updatedCart = { ...mockCart, email: 'test@example.com' }
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ cart: updatedCart }),
        })

        const cart = await updateCart('cart_123', { email: 'test@example.com' })

        expect(cart?.email).toBe('test@example.com')
      })
    })

    describe('createPaymentCollection', () => {
      it('creates a payment collection for a cart', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            payment_collection: {
              id: 'pay_col_123',
              currency_code: 'usd',
              amount: 129,
            },
          }),
        })

        const result = await createPaymentCollection('cart_123')

        expect(result).not.toBeNull()
        expect(result?.id).toBe('pay_col_123')
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test-store-api.wcpos.com/store/payment-collections',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ cart_id: 'cart_123' }),
          })
        )
      })

      it('forwards the customer JWT as Bearer auth when provided', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            payment_collection: { id: 'pay_col_123' },
          }),
        })

        await createPaymentCollection('cart_123', 'jwt_abc')

        const [, init] = mockFetch.mock.calls[0]
        expect((init.headers as Record<string, string>).Authorization).toBe(
          'Bearer jwt_abc'
        )
      })

      it('omits Authorization when no token is provided', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            payment_collection: { id: 'pay_col_123' },
          }),
        })

        await createPaymentCollection('cart_123')

        const [, init] = mockFetch.mock.calls[0]
        expect(
          (init.headers as Record<string, string>).Authorization
        ).toBeUndefined()
      })

      it('returns null on error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        })

        const result = await createPaymentCollection('cart_123')
        expect(result).toBeNull()
      })
    })

    describe('createPaymentSession', () => {
      it('creates a payment session within an existing collection', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            payment_collection: {
              id: 'pay_col_123',
              payment_sessions: [
                {
                  id: 'payses_123',
                  provider_id: 'pp_stripe_stripe',
                  status: 'pending',
                  data: { client_secret: 'pi_secret_123' },
                },
              ],
            },
          }),
        })

        const result = await createPaymentSession('pay_col_123', 'pp_stripe_stripe')

        expect(result).not.toBeNull()
        expect(result?.clientSecret).toBe('pi_secret_123')
        expect(result?.paymentSessionId).toBe('payses_123')
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test-store-api.wcpos.com/store/payment-collections/pay_col_123/payment-sessions',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ provider_id: 'pp_stripe_stripe' }),
          })
        )
      })

      it('returns null client secret when provider does not return one', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            payment_collection: {
              id: 'pay_col_123',
              payment_sessions: [
                {
                  id: 'payses_456',
                  provider_id: 'pp_paypal_paypal',
                  status: 'pending',
                  data: {},
                },
              ],
            },
          }),
        })

        const result = await createPaymentSession('pay_col_123', 'pp_paypal_paypal')

        expect(result).not.toBeNull()
        expect(result?.clientSecret).toBeNull()
        expect(result?.paymentSessionId).toBe('payses_456')
      })

      it('selects correct session by provider_id when multiple sessions exist', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            payment_collection: {
              id: 'pay_col_123',
              payment_sessions: [
                {
                  id: 'payses_old',
                  provider_id: 'pp_stripe_stripe',
                  status: 'pending',
                  data: { client_secret: 'pi_old_secret' },
                },
                {
                  id: 'payses_new',
                  provider_id: 'pp_paypal_paypal',
                  status: 'pending',
                  data: {},
                },
              ],
            },
          }),
        })

        const result = await createPaymentSession('pay_col_123', 'pp_paypal_paypal')

        expect(result?.paymentSessionId).toBe('payses_new')
        expect(result?.clientSecret).toBeNull()
      })

      it('forwards the customer JWT as Bearer auth when provided', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            payment_collection: {
              id: 'pay_col_123',
              payment_sessions: [
                {
                  id: 'payses_123',
                  provider_id: 'pp_stripe_stripe',
                  status: 'pending',
                  data: { client_secret: 'pi_secret_123' },
                },
              ],
            },
          }),
        })

        await createPaymentSession('pay_col_123', 'pp_stripe_stripe', 'jwt_abc')

        const [, init] = mockFetch.mock.calls[0]
        expect((init.headers as Record<string, string>).Authorization).toBe(
          'Bearer jwt_abc'
        )
      })

      it('returns null on error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        })

        const result = await createPaymentSession('pay_col_123', 'pp_stripe_stripe')
        expect(result).toBeNull()
      })
    })

    describe('createCustomerSession', () => {
      it('returns the customer session client secret with Bearer auth', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ customer_session_client_secret: 'cuss_abc' }),
        })

        const result = await createCustomerSession('cart_123', 'jwt_tok')

        expect(result).toBe('cuss_abc')
        const [url, init] = mockFetch.mock.calls[0]
        expect(url).toBe(
          'https://test-store-api.wcpos.com/store/carts/cart_123/customer-session'
        )
        expect(init.method).toBe('POST')
        expect((init.headers as Record<string, string>).Authorization).toBe(
          'Bearer jwt_tok'
        )
      })

      it('returns null when the backend returns no secret', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ customer_session_client_secret: null }),
        })

        const result = await createCustomerSession('cart_123', 'jwt_tok')
        expect(result).toBeNull()
      })

      it('returns null on error so checkout is never blocked', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

        const result = await createCustomerSession('cart_123', 'jwt_tok')
        expect(result).toBeNull()
      })
    })

    describe('capturePayPalOrder', () => {
      it('captures through the Medusa store route with Bearer auth', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ order_id: 'PAYPAL_ORDER_1', status: 'COMPLETED' }),
        })

        const result = await capturePayPalOrder(
          'cart_123',
          'PAYPAL_ORDER_1',
          'jwt_tok'
        )

        expect(result).toBe(true)
        const [url, init] = mockFetch.mock.calls[0]
        expect(url).toBe(
          'https://test-store-api.wcpos.com/store/carts/cart_123/paypal/capture'
        )
        expect(init.method).toBe('POST')
        expect(JSON.parse(init.body as string)).toEqual({
          order_id: 'PAYPAL_ORDER_1',
        })
        expect((init.headers as Record<string, string>).Authorization).toBe(
          'Bearer jwt_tok'
        )
      })

      it('returns false when Medusa reports a non-completed PayPal capture', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ order_id: 'PAYPAL_ORDER_1', status: 'PENDING' }),
        })

        const result = await capturePayPalOrder('cart_123', 'PAYPAL_ORDER_1')

        expect(result).toBe(false)
      })

      it('returns false when Medusa rejects PayPal capture', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 502 })

        const result = await capturePayPalOrder('cart_123', 'PAYPAL_ORDER_1')

        expect(result).toBe(false)
      })
    })

    describe('completeCart', () => {
      it('completes cart and returns order', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            type: 'order',
            order: { id: 'order_123', status: 'pending' },
          }),
        })

        const result = await completeCart('cart_123')

        expect(result?.type).toBe('order')
        expect(result?.order?.id).toBe('order_123')
      })
    })
  })
})
