import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { NotificationBell } from './notification-bell'
import { CurrencyDropdown } from './currency-dropdown'
import { PushPrompt } from '../push-prompt'
import { cookies } from 'next/headers'
import { MobileNav } from './mobile-nav'

type Room = {
  id: string
  name: string
  invite_code: string
  role: string
}

export async function TopBar({ allRooms }: { allRooms?: Room[] }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Fetch user profile (name) and notifications in parallel
  const [profileRes, notificationsRes, cookieStore] = await Promise.all([
    supabase.from('users').select('name').eq('id', user.id).single(),
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    cookies(),
  ])

  const userName = profileRes.data?.name || 'User'
  const notifications = notificationsRes.data || []
  const useNepali = cookieStore.get('useNepali')?.value !== 'false'

  // Generate avatar initials
  const initials = userName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-[800] flex h-14 min-h-14 max-h-14 shrink-0 items-center border-b bg-white/95 shadow-sm backdrop-blur-md dark:bg-gray-950/95 md:h-16 md:min-h-16 md:max-h-16">
      <div className="mx-auto flex h-full w-full max-w-4xl items-center justify-between px-3 md:px-8">
        {/* Mobile Navigation (Hidden on Desktop) */}
        <MobileNav allRooms={allRooms || []} />

        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-3">

        {/* Push Notification Toggle */}
        <PushPrompt />

        {/* Currency Toggle */}
        <CurrencyDropdown initialUseNepali={useNepali} />

        {/* Notification Bell */}
        <NotificationBell initialNotifications={notifications} />

        {/* Profile Link — initials avatar always visible, name only on sm+ */}
        <Link
          href="/dashboard/profile"
          className="flex h-9 min-w-9 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-1.5 shadow-sm transition-all duration-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-gray-900 dark:hover:bg-slate-800 sm:px-3 md:h-10"
        >
          {/* Avatar circle with initials — always visible */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600">
            <span className="text-[11px] font-bold text-white leading-none">{initials}</span>
          </div>
          {/* Name — hidden on small screens */}
          <span className="hidden sm:block text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
            {userName}
          </span>
        </Link>
        </div>
      </div>
    </header>
  )
}
