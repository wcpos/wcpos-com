import {
  localeDirections,
  type Locale,
  type LocaleDirection,
} from '@/i18n/config'
import { supportedBaseLocaleOrDefault } from '@/lib/locale-preferences'

interface RootFallbackCopy {
  locale: Locale
  direction: LocaleDirection
  errors: {
    genericTitle: string
    genericDescription: string
    tryAgain: string
    goHome: string
    notFoundTitle: string
    notFoundDescription: string
  }
  support: string
}

type RootFallbackMessages = Omit<RootFallbackCopy, 'locale' | 'direction'>

// Inlined literals rather than `import xxMessages from '../../messages/xx.json'`:
// this module is imported by the root `not-found`/`global-error` client
// components, so catalog imports here ship every locale's full catalog
// (~1MB minified, ~300KB gzip) in the shared client bundle of EVERY page.
// The strings below must stay byte-identical to `errors.*`/`header.support`
// in messages/*.json — root-fallback-i18n.test.ts fails on any drift.
export const ROOT_FALLBACK_MESSAGES = {
  de: {
    errors: {
      genericTitle: 'Etwas ist schiefgelaufen.',
      genericDescription:
        'Der Fehler wurde gemeldet. Du kannst es erneut versuchen oder später wiederkommen.',
      tryAgain: 'Erneut versuchen',
      goHome: 'Zur Startseite',
      notFoundTitle: 'Seite nicht gefunden',
      notFoundDescription:
        'Unter dieser Adresse gibt es keine Seite. Sie wurde vielleicht verschoben, oder der Link ist falsch.',
    },
    support: 'Hilfe',
  },
  en: {
    errors: {
      genericTitle: 'Something went wrong.',
      genericDescription:
        'The error has been reported. You can try again, or come back later.',
      tryAgain: 'Try again',
      goHome: 'Go to homepage',
      notFoundTitle: 'Page not found',
      notFoundDescription:
        'There is no page at this address. It may have moved, or the link may be wrong.',
    },
    support: 'Support',
  },
  es: {
    errors: {
      genericTitle: 'Algo salió mal.',
      genericDescription:
        'Se ha informado del error. Puedes intentarlo de nuevo o volver más tarde.',
      tryAgain: 'Intentar de nuevo',
      goHome: 'Ir a la página de inicio',
      notFoundTitle: 'Página no encontrada',
      notFoundDescription:
        'No hay ninguna página en esta dirección. Puede que se haya movido o que el enlace sea incorrecto.',
    },
    support: 'Soporte',
  },
  fr: {
    errors: {
      genericTitle: 'Une erreur est survenue.',
      genericDescription:
        'L’erreur a été signalée. Vous pouvez réessayer ou revenir plus tard.',
      tryAgain: 'Réessayer',
      goHome: 'Aller à l’accueil',
      notFoundTitle: 'Page introuvable',
      notFoundDescription:
        'Il n’y a pas de page à cette adresse. Elle a peut-être été déplacée, ou le lien est erroné.',
    },
    support: 'Assistance',
  },
  it: {
    errors: {
      genericTitle: 'Qualcosa è andato storto.',
      genericDescription:
        'L’errore è stato segnalato. Puoi riprovare o tornare più tardi.',
      tryAgain: 'Riprova',
      goHome: 'Vai alla home',
      notFoundTitle: 'Pagina non trovata',
      notFoundDescription:
        'Non c’è nessuna pagina a questo indirizzo. Potrebbe essere stata spostata, oppure il link è sbagliato.',
    },
    support: 'Supporto',
  },
  ja: {
    errors: {
      genericTitle: '問題が発生しました。',
      genericDescription:
        'エラーは報告されました。もう一度お試しいただくか、後ほど戻ってきてください。',
      tryAgain: '再試行',
      goHome: 'ホームへ移動',
      notFoundTitle: 'ページが見つかりません',
      notFoundDescription:
        'このアドレスにはページがありません。移動したか、リンクが間違っている可能性があります。',
    },
    support: 'サポート',
  },
  ko: {
    errors: {
      genericTitle: '문제가 발생했습니다.',
      genericDescription:
        '오류가 보고되었습니다. 다시 시도하거나 나중에 돌아와 주세요.',
      tryAgain: '다시 시도',
      goHome: '홈으로 이동',
      notFoundTitle: '페이지를 찾을 수 없습니다',
      notFoundDescription:
        '이 주소에는 페이지가 없습니다. 페이지가 이동했거나 링크가 잘못되었을 수 있습니다.',
    },
    support: '지원',
  },
  nl: {
    errors: {
      genericTitle: 'Er is iets misgegaan.',
      genericDescription:
        'De fout is gemeld. Je kunt het opnieuw proberen of later terugkomen.',
      tryAgain: 'Opnieuw proberen',
      goHome: 'Ga naar de startpagina',
      notFoundTitle: 'Pagina niet gevonden',
      notFoundDescription:
        'Op dit adres staat geen pagina. Misschien is die verplaatst, of klopt de link niet.',
    },
    support: 'Ondersteuning',
  },
  pt: {
    errors: {
      genericTitle: 'Algo correu mal.',
      genericDescription:
        'O erro foi comunicado. Pode tentar novamente ou voltar mais tarde.',
      tryAgain: 'Tentar novamente',
      goHome: 'Ir para a página inicial',
      notFoundTitle: 'Página não encontrada',
      notFoundDescription:
        'Não existe nenhuma página neste endereço. Pode ter sido movida, ou a ligação pode estar errada.',
    },
    support: 'Suporte',
  },
  zh: {
    errors: {
      genericTitle: '出了点问题。',
      genericDescription: '错误已报告。您可以重试，或稍后再回来。',
      tryAgain: '重试',
      goHome: '前往首页',
      notFoundTitle: '页面未找到',
      notFoundDescription: '此地址没有页面。页面可能已移动，或者链接有误。',
    },
    support: '支持',
  },
} satisfies Record<Locale, RootFallbackMessages>

export function resolveRootFallbackLocale(
  source?: string | readonly string[] | null
): Locale {
  return supportedBaseLocaleOrDefault(source)
}

export function rootFallbackCopy(
  source?: string | readonly string[] | null
): RootFallbackCopy {
  const locale = resolveRootFallbackLocale(source)
  return { locale, direction: localeDirections[locale], ...ROOT_FALLBACK_MESSAGES[locale] }
}

export function rootFallbackHref(locale: Locale, pathname: `/${string}`): string {
  const normalizedPathname = pathname === '/' ? '' : pathname
  const localePrefix = locale === 'en' ? '' : `/${locale}`

  return `${localePrefix}${normalizedPathname}` || '/'
}

export function browserLanguagePreferences(): string | readonly string[] | undefined {
  if (typeof navigator === 'undefined') return undefined

  return navigator.languages.length > 0 ? navigator.languages : navigator.language
}
