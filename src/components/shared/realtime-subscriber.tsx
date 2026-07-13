'use client'

import { useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export function RealtimeSubscriber() {
  const router = useRouter()
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [, startTransition] = useTransition()

  const refresh = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(() => router.refresh())
    }, 300)
  }

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // ── Supabase Realtime (instant when it works) ──────────────────────────
    const channel = supabase
      .channel('global-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, refresh)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Connected ✓')
        }
      })

    // ── Polling fallback (guaranteed every 8 seconds) ──────────────────────
    // This ensures data is always fresh even if realtime is not broadcasting.
    const pollInterval = setInterval(() => {
      startTransition(() => router.refresh())
    }, 8000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
