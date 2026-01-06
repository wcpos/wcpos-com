import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/services/core/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.LOCAL_DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      '',
  },
})

