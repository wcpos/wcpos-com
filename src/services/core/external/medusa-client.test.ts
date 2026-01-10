import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock server-only (this module prevents client-side imports)
vi.mock('server-only', () => ({}))

// Mock environment variables
vi.mock('@/utils/env', () => ({
  env: {
    MEDUSA_BACKEND_URL: 'https://store-api.wcpos.com',
    MEDUSA_PUBLISHABLE_KEY: 'pk_test_123',
  },
}))

// Import after mocks are set up
import {
  getProducts,
  getWcposProProducts,
  getProductByHandle,
  getProductById,
  getRegions,
  formatPrice,
  getVariantPrice,
  clearProductCache,
  createCart,
  getCart,
  addLineItem,
  updateCart,
  createPaymentSessions,
  setPaymentSession,
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
    clearProductCache()
  })

  afterEach(() => {
    clearProductCache()
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
        'https://store-api.wcpos.com/store/products?status=published&fields=*variants.prices',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-publishable-api-key': 'pk_test_123',
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

    it('uses cache on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [mockProduct] }),
      })

      await getProducts()
      await getProducts()

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('getWcposProProducts', () => {
    it('filters products to only wcpos-pro handles', async () => {
      const otherProduct = { ...mockProduct, id: 'prod_other', handle: 'other-product' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [mockProduct, mockLifetimeProduct, otherProduct],
        }),
      })

      const products = await getWcposProProducts()

      expect(products).toHaveLength(2)
      expect(products.every((p) => p.handle?.startsWith('wcpos-pro-'))).toBe(true)
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
          'https://store-api.wcpos.com/store/carts',
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

    describe('createPaymentSessions', () => {
      it('initializes payment sessions', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ cart: mockCart }),
        })

        const cart = await createPaymentSessions('cart_123')

        expect(cart).not.toBeNull()
        expect(mockFetch).toHaveBeenCalledWith(
          'https://store-api.wcpos.com/store/carts/cart_123/payment-sessions',
          expect.objectContaining({ method: 'POST' })
        )
      })
    })

    describe('setPaymentSession', () => {
      it('selects a payment provider', async () => {
        const cartWithSession = {
          ...mockCart,
          payment_session: { provider_id: 'stripe' },
        }
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ cart: cartWithSession }),
        })

        const cart = await setPaymentSession('cart_123', 'stripe')

        expect(cart).not.toBeNull()
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
