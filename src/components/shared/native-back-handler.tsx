'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function NativeBackHandler() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()
  const router = useRouter()

  useEffect(() => {
    if (pathname === '/dashboard') return
    if (!pathname.startsWith('/dashboard/')) return

    const currentUrl = `${pathname}${search ? `?${search}` : ''}`

    if (window.history.state?.nativeBackGuardFor !== currentUrl) {
      window.history.pushState({ nativeBackGuardFor: currentUrl }, '', currentUrl)
    }

    const handleBack = () => {
      const room = new URLSearchParams(window.location.search).get('room')
      router.replace(room ? `/dashboard?room=${room}` : '/dashboard')
    }

    window.addEventListener('popstate', handleBack, { once: true })
    return () => window.removeEventListener('popstate', handleBack)
  }, [pathname, router, search])

  return null
}