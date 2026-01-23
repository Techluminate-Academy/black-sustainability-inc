import { useEffect } from 'react'
import { useRouter } from 'next/router'
import type { AppProps } from 'next/app'
import * as gtag from '../lib/gtag'
import { SessionProvider } from "next-auth/react"
import usePerformanceMonitoring from '../hooks/usePerformanceMonitoring'
import { Toaster } from 'react-hot-toast'
import "@/styles/globals.css"

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  // Initialize performance monitoring
  usePerformanceMonitoring()

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      gtag.pageview(url)
    }

    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  return (
    <SessionProvider session={pageProps.session}>
      <Component {...pageProps} />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 5000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </SessionProvider>
  )
}