'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const EXIT_BACK_WINDOW_MS = 1800

export function NativeBackHandler() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()
  const router = useRouter()
  const lastDashboardBackRef = useRef(0)
  const hintTimerRef = useRef<number | null>(null)
  const [showExitHint, setShowExitHint] = useState(false)

  useEffect(() => {
    setShowExitHint(false)
    lastDashboardBackRef.current = 0

    if (hintTimerRef.current) {
      window.clearTimeout(hintTimerRef.current)
      hintTimerRef.current = null
    }
  }, [pathname, search])

  useEffect(() => {
    if (pathname !== '/dashboard' && !pathname.startsWith('/dashboard/')) return

    const currentUrl = `${pathname}${search ? `?${search}` : ''}`
    const pushGuardState = () => {
      const currentState = window.history.state || {}
      if (currentState.nativeBackGuardFor !== currentUrl) {
        window.history.pushState({ ...currentState, nativeBackGuardFor: currentUrl }, '', currentUrl)
      }
    }

    pushGuardState()

    const handleBack = () => {
      if (pathname !== '/dashboard') {
        const room = new URLSearchParams(window.location.search).get('room')
        router.replace(room ? `/dashboard?room=${room}` : '/dashboard')
        return
      }

      const now = Date.now()
      if (now - lastDashboardBackRef.current <= EXIT_BACK_WINDOW_MS) {
        window.removeEventListener('popstate', handleBack)
        if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current)
        setShowExitHint(false)
        window.history.back()
        return
      }

      lastDashboardBackRef.current = now
      setShowExitHint(true)
      pushGuardState()

      if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current)
      hintTimerRef.current = window.setTimeout(() => {
        setShowExitHint(false)
        lastDashboardBackRef.current = 0
        hintTimerRef.current = null
      }, EXIT_BACK_WINDOW_MS)
    }

    window.addEventListener('popstate', handleBack)
    return () => {
      window.removeEventListener('popstate', handleBack)
      if (hintTimerRef.current) {
        window.clearTimeout(hintTimerRef.current)
        hintTimerRef.current = null
      }
    }
  }, [pathname, router, search])

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-5 z-[1200] flex justify-center px-4 transition-all duration-200 ease-out ${
        showExitHint ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      <div className="rounded-full bg-gray-950/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur dark:bg-white/90 dark:text-gray-950">
        Press back again to exit
      </div>
    </div>
  )
}
