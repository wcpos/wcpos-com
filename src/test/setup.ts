import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock environment variables for tests
vi.stubEnv('NODE_ENV', 'test')

// Mock server-only module (it throws in non-server environments)
vi.mock('server-only', () => ({}))


// jsdom has no IntersectionObserver; motion's whileInView (and the motion
// kit's IO-gated canvases) need one. Minimal stub: never fires.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  globalThis.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver
}
