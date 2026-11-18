# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce register that lets me sell my existing catalog at the counter, including offline.
Why version 2: Register opening and closing, split payments and today’s sales reporting are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: `/compare/square`, desktop and phone.
- Element: “Every sale is a WooCommerce order, so there is nothing to sync”; repeated in the comparison table and recommendation.
- Problem: Observed: the blanket “nothing to sync” claim conflicts with this page’s own explanation that offline sales “sync when [the connection] returns.” The defensible advantage is avoiding a separate Square catalog, not eliminating synchronization.
- Why it costs: Inferred: a buyer concerned about stock accuracy sees an overstated technical advantage and has reason to distrust the comparison’s promise that every fact is checkable.
- Fix: Replace all three “nothing to sync” claims with the existing, narrower explanation: no separate Square catalog to maintain; offline WCPOS sales synchronize after reconnection.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, phone, 390×844.
- Element: “Download for macOS” appears before “Every app connects to the free WordPress plugin — install it first.”
- Problem: Observed: the download button is visible in the captured fold, but the required plugin instruction and link are below the visible area. The visual order encourages the second setup step before explaining the first.
- Why it costs: Inferred: a first-time buyer can download an app without understanding that it requires installation on their WooCommerce store, making initial setup feel less straightforward than the page promises.
- Fix: Move the existing linked plugin prerequisite immediately above the selected platform’s download button.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/downloads`, metadata for desktop and mobile search.
- Element: “Download WCPOS — the free plugin plus the desktop, iOS, Android and web apps. See the latest version and recent release notes.”
- Problem: Observed: the description presents mobile apps alongside released desktop apps without the beta qualification shown on the page; the supplied product facts say the iOS and Android 2.0 store apps are not released.
- Why it costs: Inferred: if used as the search snippet, this attracts buyers expecting a released mobile 2.0 download and creates an expectation the destination cannot meet. Actual snippet selection and click impact are not verified.
- Fix: State that web and desktop 2.0 are available and iOS/Android apps remain in beta, with mobile 2.0 store releases pending.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: the home “Internet drops? Keep selling” claim omits the connected-reader limitation explained on `/downloads`.
Observed: every captured Lighthouse SEO score is 100, and all recorded phone document widths equal 390px.
Not verified: Dutch visual wrapping and full-page layouts; their screenshots are absent from the supplied shots folder.