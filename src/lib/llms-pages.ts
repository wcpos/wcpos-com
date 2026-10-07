import { marketingRoutes } from '@/app/sitemap'
import { localeUrl } from '@/lib/seo'
import en from '../../messages/en.json'

const pageMessageKeys: Record<
  (typeof marketingRoutes)[number]['path'],
  { title: string; description: string; content: readonly string[] }
> = {
  '/': { title: 'metadata.siteTitle', description: 'home.meta.description',
    content: [
      'home.story.a1.h', 'home.story.a1.b', 'home.story.a2.h', 'home.story.a2.b',
      'home.story.a3.h', 'home.story.a3.b', 'home.story.a4.h', 'home.story.a4.b',
      'home.useCases.title', 'home.useCases.cards', 'home.features', 'home.pricing',
      'home.trust.quote', 'home.trust.attribution', 'home.cta.title', 'home.cta.subtitle',
    ],
  },
  '/downloads': { title: 'downloads.meta.title', description: 'downloads.meta.description',
    content: ['downloads.hero.title', 'downloads.hero.pluginNotice', 'downloads.page.start', 'downloads.page.steps', 'downloads.howItFits'],
  },
  '/pro': { title: 'pro.metadata.title', description: 'pro.metadata.description',
    content: ['pro.hero', 'pro.features', 'pro.faq'],
  },
  '/extensions': { title: 'extensions.metadata.title', description: 'extensions.metadata.description',
    content: ['extensions.hero.subtitle'],
  },
  '/compare': { title: 'compare.hub.metadata.title', description: 'compare.hub.metadata.description',
    content: ['compare.hub', 'compare.disclosure'],
  },
  '/compare/oliver-pos': { title: 'compare.oliver.metadata.title', description: 'compare.oliver.metadata.description',
    content: ['compare.oliver', 'compare.disclosure'],
  },
  '/compare/woocommerce-pos': { title: 'compare.woocommerce.metadata.title', description: 'compare.woocommerce.metadata.description',
    content: ['compare.woocommerce', 'compare.disclosure'],
  },
  '/compare/square': { title: 'compare.square.metadata.title', description: 'compare.square.metadata.description',
    content: ['compare.square', 'compare.disclosure'],
  },
  '/compare/jovvie': { title: 'compare.jovvie.metadata.title', description: 'compare.jovvie.metadata.description',
    content: ['compare.jovvie', 'compare.disclosure'],
  },
  '/compare/vitepos': { title: 'compare.vitepos.metadata.title', description: 'compare.vitepos.metadata.description',
    content: ['compare.vitepos', 'compare.disclosure'],
  },
  '/compare/yith-pos': { title: 'compare.yith.metadata.title', description: 'compare.yith.metadata.description',
    content: ['compare.yith', 'compare.disclosure'],
  },
  '/about-us': { title: 'about.meta.title', description: 'about.meta.description',
    content: [
      'about.hero.title', 'about.hero.subtitle', 'about.founder.intro', 'about.founder.p1',
      'about.founder.p2', 'about.founder.p3', 'about.timeline.heading', 'about.timeline.items',
      'about.values', 'about.cta.title', 'about.cta.subtitle',
    ],
  },
  '/roadmap': { title: 'roadmap.meta.title', description: 'roadmap.meta.description',
    content: ['roadmap.page'],
  },
  '/changelog': { title: 'changelog.meta.title', description: 'changelog.meta.description',
    content: ['changelog.page'],
  },
  '/support': { title: 'support.meta.title', description: 'support.meta.description',
    content: ['support.chat.hero', 'support.chat.examples', 'support.discord'],
  },
  '/privacy': { title: 'legal.privacy.meta.title', description: 'legal.privacy.meta.description',
    content: ['legal.privacy'],
  },
  '/terms': { title: 'legal.terms.meta.title', description: 'legal.terms.meta.description',
    content: ['legal.terms'],
  },
  '/refunds': { title: 'legal.refunds.meta.title', description: 'legal.refunds.meta.description',
    content: ['legal.refunds'],
  },
}

export function message(key: string): string {
  const value = key.split('.').reduce<unknown>(
    (value, part) => (value as Record<string, unknown>)?.[part],
    en,
  )
  if (typeof value !== 'string') {
    throw new Error(`Expected a string for message key: ${key}`)
  }
  return value
}

export interface LlmsPage {
  path: string
  url: string
  title: string
  description: string
  content: readonly string[]
}

// Both /llms.txt and /llms-full.txt read this list.
export const llmsPages: readonly LlmsPage[] = marketingRoutes.map((route) => {
  const keys = pageMessageKeys[route.path]
  const title = message(keys.title)
  return {
    path: route.path,
    url: localeUrl('en', route.path),
    title,
    description: message(keys.description) || title,
    content: keys.content,
  }
})
