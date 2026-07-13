import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { UserCircle } from 'lucide-react'
import { NotificationBell } from './notification-bell'
import { CurrencyDropdown } from './currency-dropdown'
import { cookies } from 'next/headers'

export async function TopBar() {
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
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b shrink-0 h-16 flex items-center">
      <div className="w-full max-w-4xl mx-auto px-4 md:px-8 flex items-center justify-end gap-3">

        {/* Currency Toggle */}
        <CurrencyDropdown initialUseNepali={useNepali} />

        {/* Notification Bell */}
        <NotificationBell initialNotifications={notifications} />

        {/* Profile Link with Name */}
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 group"
        >
          {/* Avatar circle with initials */}
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-white leading-none">{initials}</span>
          </div>
          {/* Name — hidden on very small screens */}
          <span className="hidden sm:block text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
            {userName}
          </span>
          <UserCircle className="sm:hidden w-4 h-4 text-slate-500 dark:text-slate-400" />
        </Link>

      </div>
    </header>
  )
}
