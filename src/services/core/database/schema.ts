import { createId } from '@paralleldrive/cuid2'
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

/**
 * Database Schema for wcpos.com
 *
 * Tables:
 * - users: User accounts (customers and admins)
 * - sessions: JWT session tracking
 * - apiLogs: API request/response logging for analytics
 * - licenseKeys: License key management (placeholder for future)
 */

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'admin'])
export const userStatusEnum = pgEnum('user_status', [
  'pending',
  'active',
  'suspended',
])
export const logLevelEnum = pgEnum('log_level', [
  'info',
  'warn',
  'error',
  'debug',
])

// Users table
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password'), // null for OAuth-only users or MedusaJS-only auth
  
  // MedusaJS Integration
  medusaCustomerId: text('medusa_customer_id').unique(), // Reference to MedusaJS customer
  
  // Basic user info (kept for session management and WCPOS-specific features)
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: userRoleEnum('role').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('pending'),
  avatar: text('avatar'),
  emailVerified: boolean('email_verified').default(false),
  emailVerificationToken: text('email_verification_token'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: timestamp('password_reset_expires'),
  lastLoginAt: timestamp('last_login_at'),
  
  // OAuth provider IDs (for linking accounts)
  googleId: text('google_id'),
  githubId: text('github_id'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Sessions table
export const sessions = pgTable('sessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// API Logs table - for tracking all API usage
export const apiLogs = pgTable(
  'api_logs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    // Request info
    endpoint: varchar('endpoint', { length: 255 }).notNull(),
    method: varchar('method', { length: 10 }).notNull(),
    // Context
    platform: varchar('platform', { length: 50 }), // electron, web, ios, android, wordpress
    appVersion: varchar('app_version', { length: 50 }),
    // For license-related requests
    licenseKeyHash: varchar('license_key_hash', { length: 64 }), // SHA-256 hash for privacy
    instance: text('instance'), // Store URL or device ID
    // Response info
    statusCode: integer('status_code'),
    responseTime: integer('response_time'), // in milliseconds
    // Error tracking
    level: logLevelEnum('level').notNull().default('info'),
    errorMessage: text('error_message'),
    errorStack: text('error_stack'),
    // Client info
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    country: varchar('country', { length: 2 }), // ISO country code
    // Metadata
    metadata: text('metadata'), // JSON for additional context
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('api_logs_endpoint_idx').on(table.endpoint),
    index('api_logs_created_at_idx').on(table.createdAt),
    index('api_logs_platform_idx').on(table.platform),
    index('api_logs_level_idx').on(table.level),
    index('api_logs_license_key_hash_idx').on(table.licenseKeyHash),
  ]
)

// License Keys table (placeholder for future license server integration)
export const licenseKeys = pgTable(
  'license_keys',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    licenseKey: varchar('license_key', { length: 255 }).notNull().unique(),
    productId: varchar('product_id', { length: 100 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('active'), // active, expired, revoked
    maxActivations: integer('max_activations').default(1),
    currentActivations: integer('current_activations').default(0),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('license_keys_user_id_idx').on(table.userId),
    index('license_keys_status_idx').on(table.status),
  ]
)

// Types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type ApiLog = typeof apiLogs.$inferSelect
export type NewApiLog = typeof apiLogs.$inferInsert
export type LicenseKey = typeof licenseKeys.$inferSelect
export type NewLicenseKey = typeof licenseKeys.$inferInsert

