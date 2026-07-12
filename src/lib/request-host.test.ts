import { describe, expect, it } from 'vitest'
import { isLoopbackHost } from './request-host'

describe('isLoopbackHost', () => {
  it.each([
    'localhost',
    'localhost:3000',
    ' LOCALHOST:3000 ',
    '127.0.0.1',
    '127.0.0.1:4173',
    '[::1]',
    '[::1]:3000',
  ])('accepts the loopback host %s', (host) => {
    expect(isLoopbackHost(host)).toBe(true)
  })

  it.each([
    undefined,
    null,
    '',
    '   ',
    'unknown.example.com',
    'preview.vercel.app',
    'project-git-branch.vercel.app',
    'localhost.vercel.app',
    'localhost.example.com',
    '127.0.0.1.example.com',
    '::1',
    '::1:3000',
    '[::1]evil',
    'localhost:not-a-port',
    'localhost:3000:4000',
    'https://localhost:3000',
  ])('rejects the non-loopback host %s', (host) => {
    expect(isLoopbackHost(host)).toBe(false)
  })
})
