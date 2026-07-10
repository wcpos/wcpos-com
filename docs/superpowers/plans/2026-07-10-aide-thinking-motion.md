# Aide Thinking Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Aide’s pending support response visibly active with a brand-aligned, accessible text shimmer.

**Architecture:** Keep request state and rendering in the existing `SupportChat` component. Add one colocated CSS module for the gradient keyframes and reduced-motion fallback, and extend the existing browser test to exercise the unresolved request state and computed animation.

**Tech Stack:** React 19, Next.js 16, CSS Modules, Tailwind CSS utilities, Playwright

## Global Constraints

- Keep all existing localized “Aide is thinking…” strings unchanged.
- Do not change the support request, error, feedback, or Turnstile flows.
- The pending state must be exposed as a polite live status.
- Disable the shimmer under `prefers-reduced-motion: reduce`.
- Add no dependency and no timer-driven production JavaScript.

---

### Task 1: Pending assistant-turn indicator

**Files:**
- Create: `src/components/support/support-chat.module.css`
- Modify: `src/components/support/support-chat.tsx:1-220`
- Test: `e2e/support.spec.ts`

**Interfaces:**
- Consumes: the existing `status === 'asking'` request state and `t('thinking')` translation.
- Produces: a `role="status"` pending assistant row whose text has a non-`none` computed CSS animation when motion is allowed.

- [ ] **Step 1: Write the failing browser test**

Gate the mocked answer until the test releases it, then assert the pending state:

```ts
test('support page answers a question and shows Discord', async ({ page }) => {
  let releaseAnswer: () => void = () => {}
  const answerGate = new Promise<void>((resolve) => {
    releaseAnswer = resolve
  })

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.route('**/api/support/ask', async (route) => {
    await answerGate
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        answer: 'Open **Settings → Printing**.',
        sessionId: '00000000-0000-0000-0000-000000000000',
      }),
    })
  })

  await page.goto('/en/support')
  await expect(page.getByRole('heading', { name: /how can we help/i })).toBeVisible()

  await page.getByRole('textbox').pressSequentially('How do I print receipts?')
  await page.getByRole('button', { name: /^ask$/i }).click()

  await expect(page.getByText('How do I print receipts?')).toBeVisible()
  const thinking = page.getByRole('status').filter({ hasText: 'Aide is thinking…' })
  await expect(thinking).toBeVisible()
  await expect(thinking.locator('p')).not.toHaveCSS('animation-name', 'none')

  releaseAnswer()

  await expect(thinking).toBeHidden()
  await expect(page.getByText(/Settings → Printing/)).toBeVisible()
  await expect(page.getByRole('heading', { name: /talk to a human/i })).toBeVisible()
})
```

- [ ] **Step 2: Run the test to verify it fails for the missing live status**

Run the local app and then the focused Chromium test:

```bash
./node_modules/.bin/next dev --turbo
BASE_URL=http://localhost:3000 ./node_modules/.bin/playwright test e2e/support.spec.ts --project=chromium
```

Expected: FAIL because no element with `role="status"` exists.

- [ ] **Step 3: Add the shimmer CSS with a reduced-motion fallback**

Create `src/components/support/support-chat.module.css`:

```css
@keyframes aide-thinking-shimmer {
  from {
    background-position: 100% 50%;
  }
  to {
    background-position: -100% 50%;
  }
}

.thinkingText {
  color: hsl(var(--muted-foreground));
  background-image: linear-gradient(
    100deg,
    hsl(var(--muted-foreground)) 0%,
    hsl(var(--muted-foreground)) 34%,
    hsl(var(--wcpos-red-accent)) 46%,
    hsl(var(--foreground)) 52%,
    hsl(var(--muted-foreground)) 66%,
    hsl(var(--muted-foreground)) 100%
  );
  background-size: 250% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: aide-thinking-shimmer 1.8s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .thinkingText {
    background: none;
    -webkit-text-fill-color: currentColor;
    animation: none;
  }
}
```

- [ ] **Step 4: Render the pending state as an accessible assistant turn**

Import the module in `support-chat.tsx`:

```ts
import styles from './support-chat.module.css'
```

Replace the static pending paragraph with:

```tsx
{status === 'asking' && (
  <div className="flex gap-3" role="status" aria-live="polite">
    <div
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wcpos-red/10 text-xs font-medium text-wcpos-red-accent"
    >
      Ai
    </div>
    <p className={`self-center text-sm ${styles.thinkingText}`}>{t('thinking')}</p>
  </div>
)}
```

- [ ] **Step 5: Run the focused test to verify it passes**

```bash
BASE_URL=http://localhost:3000 ./node_modules/.bin/playwright test e2e/support.spec.ts --project=chromium
```

Expected: PASS with one Chromium test.

- [ ] **Step 6: Run presentation-change validation**

```bash
./node_modules/.bin/eslint .
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/next build
./node_modules/.bin/playwright test e2e/support.spec.ts
```

Expected: all commands exit 0; the focused support suite passes in Chromium, Firefox, and WebKit.

- [ ] **Step 7: Commit the implementation**

```bash
git add e2e/support.spec.ts src/components/support/support-chat.tsx src/components/support/support-chat.module.css docs/superpowers/plans/2026-07-10-aide-thinking-motion.md
git commit -m "feat(support): animate Aide thinking state"
```
