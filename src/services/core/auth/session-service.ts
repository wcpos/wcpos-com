import 'server-only'

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { User } from '../database/schema'

const key = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-change-in-production'
)

export interface SessionData {
  userId: string
  email: string
  role: 'user' | 'admin'
  firstName: string | null
  lastName: string | null
  expires: Date
  sessionId: string
  [key: string]: unknown // Required for JWTPayload compatibility
}

/**
 * Session service for managing JWT-based authentication
 */
export class SessionService {
  private static readonly COOKIE_NAME = 'session'
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Create a new session for a user
   */
  static async createSession(user: User): Promise<string> {
    const sessionId = crypto.randomUUID()
    const expires = new Date(Date.now() + this.SESSION_DURATION)

    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin',
      firstName: user.firstName,
      lastName: user.lastName,
      expires,
      sessionId,
    }

    const sessionToken = await new SignJWT(sessionData)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expires)
      .sign(key)

    // Set secure HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set(this.COOKIE_NAME, sessionToken, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return sessionToken
  }

  /**
   * Get current session data
   */
  static async getSession(): Promise<SessionData | null> {
    try {
      const cookieStore = await cookies()
      const sessionToken = cookieStore.get(this.COOKIE_NAME)?.value

      if (!sessionToken) {
        return null
      }

      const { payload } = await jwtVerify(sessionToken, key, {
        algorithms: ['HS256'],
      })

      return payload as unknown as SessionData
    } catch (error) {
      console.error('[SessionService] Invalid session:', error)
      return null
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession()
    return !!session && new Date() < new Date(session.expires)
  }

  /**
   * Check if user has admin role
   */
  static async isAdmin(): Promise<boolean> {
    const session = await this.getSession()
    return !!session && session.role === 'admin'
  }

  /**
   * Destroy current session
   */
  static async destroySession(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.set(this.COOKIE_NAME, '', {
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
  }

  /**
   * Middleware helper for Next.js proxy
   */
  static async validateSession(
    request: NextRequest
  ): Promise<SessionData | null> {
    try {
      const sessionToken = request.cookies.get(this.COOKIE_NAME)?.value
      if (!sessionToken) {
        return null
      }

      const { payload } = await jwtVerify(sessionToken, key, {
        algorithms: ['HS256'],
      })

      return payload as unknown as SessionData
    } catch {
      return null
    }
  }

  /**
   * Middleware helper to refresh session if needed
   */
  static async updateSessionMiddleware(
    request: NextRequest
  ): Promise<NextResponse | null> {
    try {
      const sessionToken = request.cookies.get(this.COOKIE_NAME)?.value
      if (!sessionToken) {
        return null
      }

      const { payload } = await jwtVerify(sessionToken, key, {
        algorithms: ['HS256'],
      })

      const session = payload as unknown as SessionData

      // Check if session needs refresh (less than 1 hour remaining)
      const oneHour = 60 * 60 * 1000
      const timeUntilExpiry = new Date(session.expires).getTime() - Date.now()

      if (timeUntilExpiry < oneHour) {
        const newExpires = new Date(Date.now() + this.SESSION_DURATION)
        const newSessionData: SessionData = {
          ...session,
          expires: newExpires,
          sessionId: crypto.randomUUID(),
        }

        const newSessionToken = await new SignJWT(newSessionData)
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime(newExpires)
          .sign(key)

        const response = NextResponse.next()
        response.cookies.set(this.COOKIE_NAME, newSessionToken, {
          expires: newExpires,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        })

        return response
      }

      return null
    } catch (error) {
      console.error('[SessionService] Middleware session update failed:', error)
      return null
    }
  }
}

