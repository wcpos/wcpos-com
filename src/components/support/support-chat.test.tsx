import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (t: string) => void }) => {
    onSuccess('test-token')
    return <div data-testid="turnstile" />
  },
}))

import { SupportChat } from './support-chat'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ answer: 'Open Settings → Printing.', sessionId: 's1' }), {
        status: 200,
      })
    )
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('SupportChat', () => {
  it('submits a question and renders the answer', async () => {
    render(<SupportChat />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'How do I print?' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    await waitFor(() => expect(screen.getByText(/Open Settings/)).toBeInTheDocument())
    expect(screen.getByText('How do I print?')).toBeInTheDocument()
  })
})
