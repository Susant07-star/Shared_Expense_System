'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export function RealtimeSubscriber() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // We create a fresh browser client here to subscribe
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createBrowserClient(supabaseUrl, supabaseKey)

    const channel = supabase.channel('global-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          // Debounce the router.refresh() call to prevent spamming
          // multiple refreshes if several tables update simultaneously.
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
          timeoutRef.current = setTimeout(() => {
            router.refresh()
          }, 300)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [router])

  // This component doesn't render anything
  return null
}
