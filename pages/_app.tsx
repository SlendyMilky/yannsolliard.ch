import * as React from 'react'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'

import * as Fathom from 'fathom-client'
import posthog from 'posthog-js'
import { Analytics } from '@vercel/analytics/react'

// Import de styles
import 'katex/dist/katex.min.css' // used for rendering equations (optional)
import 'prismjs/themes/prism-coy.css' // used for code syntax highlighting (optional)
import 'react-notion-x/src/styles.css' // core styles shared by all of react-notion-x (required)
import 'styles/global.css'
import 'styles/notion.css' // global style overrides for notion
import 'styles/prism-theme.css' // global style overrides for prism theme (optional)

// Utilitaires et configurations
import { bootstrap } from '@/lib/bootstrap-client'
import { fathomConfig, fathomId, isServer, posthogConfig, posthogId } from '@/lib/config'

if (!isServer) {
  bootstrap()
}

const initializeAnalytics = () => {
  if (fathomId) {
    Fathom.load(fathomId, fathomConfig)
  }
  if (posthogId) {
    posthog.init(posthogId, posthogConfig)
  }
}

const trackPageview = () => {
  if (fathomId) {
    Fathom.trackPageview()
  }
  if (posthogId) {
    posthog.capture('$pageview')
  }
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  React.useEffect(() => {
    initializeAnalytics()

    const handleRouteChangeComplete = () => {
      trackPageview()
    }
    
    router.events.on('routeChangeComplete', handleRouteChangeComplete)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete)
    }
  }, [router.events])

  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
