import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { deferSentryClient } from './defer-sentry-client'

function createWindow(readyState: DocumentReadyState): Window {
  return Object.assign(new EventTarget(), {
    document: { readyState },
    setTimeout: window.setTimeout.bind(window),
  }) as unknown as Window
}

describe('deferSentryClient', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits for the load event before loading Sentry', async () => {
    const win = createWindow('loading')
    const load = vi.fn().mockResolvedValue({ captureException: vi.fn() })
    deferSentryClient(load, win)
    await vi.runAllTimersAsync()
    expect(load).not.toHaveBeenCalled()

    win.dispatchEvent(new Event('load'))
    win.dispatchEvent(new Event('load'))
    expect(load).not.toHaveBeenCalled()
    await vi.runAllTimersAsync()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('loads on the next idle callback when the page has already loaded', async () => {
    const requestIdleCallback = vi.fn<(_callback: () => void, _options: IdleRequestOptions) => number>()
    const win = Object.assign(createWindow('complete'), { requestIdleCallback })
    const load = vi.fn().mockResolvedValue({ captureException: vi.fn() })
    deferSentryClient(load, win)
    await vi.runAllTimersAsync()
    expect(load).not.toHaveBeenCalled()
    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 })

    requestIdleCallback.mock.calls[0][0]()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('falls back to setTimeout without requestIdleCallback', async () => {
    const win = createWindow('complete')
    const load = vi.fn().mockResolvedValue({ captureException: vi.fn() })
    deferSentryClient(load, win)
    expect(load).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(0)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('replays errors and rejections queued before Sentry loaded', async () => {
    const win = createWindow('loading')
    const captureException = vi.fn()
    deferSentryClient(async () => ({ captureException }), win)
    const error = new Error('early error')
    const reason = { rejected: true }
    win.dispatchEvent(new ErrorEvent('error', { error, message: error.message }))
    win.dispatchEvent(new ErrorEvent('error', { message: 'message only' }))
    win.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason }))
    expect(captureException).not.toHaveBeenCalled()

    win.dispatchEvent(new Event('load'))
    await vi.runAllTimersAsync()
    expect(captureException.mock.calls).toEqual([[error], ['message only'], [reason]])
  })

  it('stops listening once Sentry has loaded', async () => {
    const win = createWindow('complete')
    const remove = vi.spyOn(win, 'removeEventListener')
    const captureException = vi.fn()
    deferSentryClient(async () => ({ captureException }), win)
    await vi.runAllTimersAsync()
    expect(remove).toHaveBeenCalledWith('error', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
    win.dispatchEvent(new ErrorEvent('error', { message: 'late error' }))
    expect(captureException).not.toHaveBeenCalled()
  })

  it('drops the queue and stops listening when loading fails', async () => {
    const win = createWindow('complete')
    const remove = vi.spyOn(win, 'removeEventListener')
    deferSentryClient(vi.fn().mockRejectedValue(new Error('load failed')), win)
    win.dispatchEvent(new ErrorEvent('error', { message: 'early error' }))
    await vi.runAllTimersAsync()
    expect(remove).toHaveBeenCalledWith('error', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
  })
})
