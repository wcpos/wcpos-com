import 'server-only'

import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * PostgreSQL database connection
 * Uses postgres-js driver for optimal performance and compatibility
 */

function createDatabaseConnection() {
  // Use local database if LOCAL_DATABASE_URL is explicitly set
  const localDatabaseUrl = process.env.LOCAL_DATABASE_URL

  if (localDatabaseUrl) {
    console.log('[Database] Using local PostgreSQL connection')
    const client = postgres(localDatabaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 30,
    })
    return drizzle(client, { schema })
  }

  // Use Vercel Postgres or other hosted database
  const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL

  if (!databaseUrl) {
    // Return null database for build time / when not configured
    console.warn(
      '[Database] No database connection string found. Database features disabled.'
    )
    return null
  }

  console.log('[Database] Using hosted PostgreSQL connection')
  const client = postgres(databaseUrl, {
    max: 20,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
    prepare: false, // Disable prepared statements for better compatibility
  })
  return drizzle(client, { schema })
}

// Create the database instance (may be null if not configured)
export const db = createDatabaseConnection()

/**
 * Check if database is available
 */
export function isDatabaseAvailable(): boolean {
  return db !== null
}

/**
 * Health check for the database connection
 */
export async function checkDatabaseConnection() {
  if (!db) {
    return {
      connected: false,
      error: 'Database not configured',
      timestamp: new Date().toISOString(),
    }
  }

  try {
    const result = await db.execute(sql`SELECT 1 as connected`)
    const environment = process.env.LOCAL_DATABASE_URL ? 'local' : 'hosted'

    return {
      connected: true,
      timestamp: new Date().toISOString(),
      environment,
      result: result,
    }
  } catch (error) {
    console.error('Database connection failed:', error)
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

