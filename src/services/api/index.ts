/**
 * Services API - Entry Point
 *
 * This file exports services for use by server components.
 * All exports here are safe to use in server components and server actions.
 *
 * Usage:
 * import { electronService } from '@/services/api'
 *
 * Note: For public API routes, import directly from core/business/
 * to avoid circular dependencies.
 */

// Re-export services for server component usage
export { electronService } from '../core/business/electron-service'

