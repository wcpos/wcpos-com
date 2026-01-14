import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SessionService } from '@/services/core/auth/session-service'
import { RegisterForm } from './register-form'

async function AuthCheck() {
  // If already logged in, redirect to account
  const session = await SessionService.getSession()
  if (session) {
    redirect('/account')
  }
  return null
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={null}>
        <AuthCheck />
      </Suspense>
      
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}