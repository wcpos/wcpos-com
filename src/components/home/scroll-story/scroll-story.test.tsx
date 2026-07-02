import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import { PosScreen } from './devices/pos-screen'
import { DeviceTerminal } from './devices/terminal'
import { StoryStatic } from './story-static'
import { ScrollStory } from './scroll-story'
import { storyCopy } from './copy'

type ProgressHandler = (value: number) => void
const motionMock = vi.hoisted(() => ({
  progressHandlers: [] as ProgressHandler[],
  animate: vi.fn(() => ({ stop: vi.fn() })),
}))

vi.mock('motion/react', async () => {
  const React = await import('react')
  return {
    motion: {
      div: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
        React.createElement('div', props, children),
    },
    animate: motionMock.animate,
    useMotionValueEvent: (_value: unknown, eventName: string, handler: ProgressHandler) => {
      if (eventName === 'change') motionMock.progressHandlers.push(handler)
    },
    useScroll: () => ({ scrollYProgress: 0 }),
    useTransform: (_value: unknown, input: unknown, output?: readonly unknown[]) =>
      output?.[0] ?? (typeof input === 'function' ? input(0) : 0),
  }
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  motionMock.animate.mockClear()
  motionMock.progressHandlers.length = 0
})

function stubMatchMedia(options: {
  reducedMotion: boolean
  desktop?: boolean
}) {
  const { reducedMotion, desktop = true } = options
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion')
        ? reducedMotion
        : desktop && query.includes('min-width: 768px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  )
}

describe('PosScreen', () => {
  it('shows the product grid and cart panel on tablet screens', () => {
    render(<PosScreen variant="tablet" />)

    expect(screen.getByText('Tote Bag')).toBeInTheDocument()
    expect(screen.getByText('Customer:')).toBeInTheDocument()
    expect(screen.getByText('Charge $69')).toBeInTheDocument()
  })

  it('shows the mobile layout with bottom nav on phone screens', () => {
    render(<PosScreen variant="phone" />)

    expect(screen.getByText('Tote Bag')).toBeInTheDocument()
    expect(screen.getByText('Products')).toBeInTheDocument()
    expect(screen.getByText('Cart')).toBeInTheDocument()
    expect(screen.queryByText('Customer:')).not.toBeInTheDocument()
  })
})

describe('DeviceTerminal', () => {
  it('shows the tap-to-pay display', () => {
    render(<DeviceTerminal />)

    expect(screen.getByText('$69.00')).toBeInTheDocument()
    expect(screen.getByText('Tap to pay')).toBeInTheDocument()
  })
})

describe('StoryStatic', () => {
  it('renders all four act headings', () => {
    render(<StoryStatic />)

    for (const act of [
      storyCopy.act1,
      storyCopy.act2,
      storyCopy.act3,
      storyCopy.act4,
    ]) {
      expect(
        screen.getByRole('heading', { name: act.heading })
      ).toBeInTheDocument()
    }
  })

  it('links the CTAs to demo and download', () => {
    render(<StoryStatic />)

    expect(
      screen.getByRole('link', { name: storyCopy.act1.demoCta.label })
    ).toHaveAttribute('href', storyCopy.act1.demoCta.href)
    expect(
      screen.getByRole('link', { name: storyCopy.act1.downloadCta.label })
    ).toHaveAttribute('href', storyCopy.act1.downloadCta.href)
  })

  it('keeps a page h1 on static-only renders (mobile, reduced motion)', () => {
    render(<StoryStatic />)

    const heading = screen.getByRole('heading', {
      name: storyCopy.act1.heading,
    })
    expect(heading.tagName).toBe('H1')
  })

  it('shows the trust badges', () => {
    render(<StoryStatic />)

    for (const badge of storyCopy.act1.trustBadges) {
      expect(screen.getByText(badge)).toBeInTheDocument()
    }
  })
})

describe('ScrollStory', () => {
  it('keeps the motion test mock compatible with act gravity', async () => {
    const motionReact = await import('motion/react')

    expect(motionReact.animate).toEqual(expect.any(Function))
  })

  it('renders the pinned choreography with all act copy in the DOM', () => {
    stubMatchMedia({ reducedMotion: false })
    render(<ScrollStory />)

    const scroller = screen.getByTestId('story-scroller')
    expect(
      within(scroller).getByRole('heading', {
        level: 1,
        name: storyCopy.act1.heading,
      })
    ).toBeInTheDocument()
    for (const act of [storyCopy.act2, storyCopy.act3, storyCopy.act4]) {
      expect(within(scroller).getByText(act.heading)).toBeInTheDocument()
    }
    expect(screen.queryByTestId('story-static')).not.toBeInTheDocument()
  })

  it('drops the pinned scroller under prefers-reduced-motion', () => {
    stubMatchMedia({ reducedMotion: true })
    render(<ScrollStory />)

    expect(screen.queryByTestId('story-scroller')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('story-static')).toHaveLength(1)
  })

  it('does not render the desktop photo branch on mobile viewports', () => {
    stubMatchMedia({ reducedMotion: false, desktop: false })
    const { container } = render(<ScrollStory />)

    expect(screen.queryByTestId('story-scroller')).not.toBeInTheDocument()
    expect(screen.getByTestId('story-static')).toBeInTheDocument()
    expect(container.innerHTML).not.toContain('/images/story/counter-photo.avif')
    expect(container.innerHTML).not.toContain('/images/story/counter-photo.webp')
  })

  it('disables every scroll-story animation under prefers-reduced-motion', () => {
    const style = document.createElement('style')
    style.textContent = readFileSync(
      'src/components/home/scroll-story/story.module.css',
      'utf8'
    )
    document.head.append(style)

    const sheet = document.styleSheets.item(document.styleSheets.length - 1)
    if (!sheet) throw new Error('scroll story stylesheet was not loaded')

    const reducedMotionRule = Array.from(sheet.cssRules).find(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule &&
        rule.conditionText.includes('prefers-reduced-motion')
    )

    if (!reducedMotionRule) {
      throw new Error('reduced-motion media rule was not found')
    }

    const reducedMotionStyles = Array.from(reducedMotionRule.cssRules).filter(
      (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule
    )
    const selectors = reducedMotionStyles
      .map((rule) => rule.selectorText)
      .join(',')

    for (const rule of reducedMotionStyles) {
      expect(rule.style.animation).toBe('none')
    }

    for (const selector of [
      '.gridDrift',
      '.barcodePattern',
      '.particlesA',
      '.particlesB',
      '.lightPool',
    ]) {
      expect(selectors).toContain(selector)
    }
  })

  it('mounts the act-4 dot orbit', () => {
    stubMatchMedia({ reducedMotion: false })
    render(<ScrollStory />)

    expect(
      within(screen.getByTestId('story-scroller')).getByTestId('dot-orbit')
    ).toBeInTheDocument()
  })

  it('removes the Act 1 CTAs from interaction after Act 1 fades out', () => {
    stubMatchMedia({ reducedMotion: false })
    render(<ScrollStory />)

    const act1Overlay = within(screen.getByTestId('story-scroller')).getByRole(
      'heading',
      { level: 1, name: storyCopy.act1.heading }
    ).parentElement

    expect(act1Overlay).not.toHaveAttribute('inert')

    act(() => {
      for (const handler of motionMock.progressHandlers) handler(0.21)
    })

    expect(act1Overlay).toHaveAttribute('inert')
    expect(act1Overlay).toHaveClass('pointer-events-none')
  })
})
