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

  // Fetch notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Get currency preference
  const cookieStore = await cookies()
  const useNepali = cookieStore.get('useNepali')?.value !== 'false'

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b px-4 h-16 flex items-center justify-end gap-3 shrink-0">
      
      {/* Currency Toggle */}
      <CurrencyDropdown initialUseNepali={useNepali} />

      {/* Notification Bell */}
      <NotificationBell initialNotifications={notifications || []} />

      {/* Profile Link */}
      <Link href="/dashboard/profile" className="flex items-center justify-center p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
        <UserCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
      </Link>
      
    </header>
  )
}
