import { test, expect, type Page } from '@playwright/test'

/**
 * The settle assist in act-gravity.ts must never pull a slow scroller back
 * against the direction they are travelling (audit #1).
 */
test.use({ viewport: { width: 1440, height: 900 } })

async function openStory(page: Page) {
  await page.goto('/')
  await page.getByTestId('story-scroller').waitFor()
  await page.mouse.move(720, 450)
}

const readScrollY = (page: Page) => page.evaluate(() => window.scrollY)

test.describe('Scroll story settle assist', () => {
  test.setTimeout(150_000)

  test('slow 200px wheel steps from the top reach the pricing section', async ({
    page,
  }) => {
    await openStory(page)
    const pricing = page.getByRole('heading', {
      name: 'Start free. Upgrade when you need more.',
    })

    let previous = await readScrollY(page)
    for (let step = 0; step < 70; step++) {
      await page.mouse.wheel(0, 200)
      await page.waitForTimeout(900)
      const scrollY = await readScrollY(page)
      expect(scrollY, `step ${step + 1} moved backwards`).toBeGreaterThanOrEqual(
        previous - 2
      )
      previous = scrollY
      const reached = await pricing.evaluate(
        (el) => el.getBoundingClientRect().top < window.innerHeight
      )
      if (reached) break
    }

    await expect(pricing).toBeInViewport()
  })

  test('notched 100px wheel steps scroll past the pinned story', async ({
    page,
  }) => {
    await openStory(page)
    const storyEnd = await page
      .getByTestId('story-scroller')
      .evaluate(
        (el: HTMLElement) =>
          el.offsetTop + el.offsetHeight - window.innerHeight
      )

    let previous = await readScrollY(page)
    for (let step = 0; step < 70 && previous <= storyEnd; step++) {
      await page.mouse.wheel(0, 100)
      await page.waitForTimeout(700)
      const scrollY = await readScrollY(page)
      expect(scrollY, `step ${step + 1} moved backwards`).toBeGreaterThanOrEqual(
        previous - 2
      )
      previous = scrollY
    }

    expect(previous).toBeGreaterThan(storyEnd)
  })
})
