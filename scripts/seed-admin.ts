/**
 * Seed script to create the initial admin user
 *
 * Usage:
 *   pnpm seed:admin
 *
 * Environment variables required:
 *   - DATABASE_URL or POSTGRES_URL
 *   - ADMIN_EMAIL (optional, defaults to admin@wcpos.com)
 *   - ADMIN_PASSWORD (required)
 */

import bcrypt from 'bcryptjs'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { createId } from '@paralleldrive/cuid2'

// Define the schema inline to avoid import issues
const usersTable = {
  id: 'id',
  email: 'email',
  password: 'password',
  firstName: 'first_name',
  lastName: 'last_name',
  role: 'role',
  status: 'status',
  emailVerified: 'email_verified',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or POSTGRES_URL environment variable is required')
    process.exit(1)
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@wcpos.com'
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    console.error('❌ ADMIN_PASSWORD environment variable is required')
    console.log('\nUsage:')
    console.log('  ADMIN_PASSWORD="your-password" pnpm seed:admin')
    console.log('\nOptional:')
    console.log('  ADMIN_EMAIL="your-email@example.com" (defaults to admin@wcpos.com)')
    process.exit(1)
  }

  console.log('🔌 Connecting to database...')

  const client = postgres(databaseUrl, {
    max: 1,
    ssl: 'require',
  })

  const db = drizzle(client)

  try {
    // Check if user already exists
    console.log(`📧 Checking if ${adminEmail} already exists...`)

    const existingUsers = await client`
      SELECT id, email FROM users WHERE email = ${adminEmail}
    `

    if (existingUsers.length > 0) {
      console.log(`⚠️  User ${adminEmail} already exists. Updating to admin role...`)

      await client`
        UPDATE users
        SET role = 'admin', status = 'active', updated_at = NOW()
        WHERE email = ${adminEmail}
      `

      console.log('✅ User updated to admin role!')
    } else {
      // Hash password
      console.log('🔐 Hashing password...')
      const hashedPassword = await bcrypt.hash(adminPassword, 12)

      // Create admin user
      console.log(`👤 Creating admin user: ${adminEmail}...`)

      const userId = createId()

      await client`
        INSERT INTO users (id, email, password, role, status, email_verified, created_at, updated_at)
        VALUES (
          ${userId},
          ${adminEmail},
          ${hashedPassword},
          'admin',
          'active',
          true,
          NOW(),
          NOW()
        )
      `

      console.log('✅ Admin user created successfully!')
    }

    console.log('\n🎉 Done! You can now log in at /login')
    console.log(`   Email: ${adminEmail}`)
    console.log('   Password: (the one you provided)')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

