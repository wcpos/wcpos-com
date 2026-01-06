import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock environment variables for tests
vi.stubEnv('NODE_ENV', 'test')

// Mock server-only module (it throws in non-server environments)
vi.mock('server-only', () => ({}))

