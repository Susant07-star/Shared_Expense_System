import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/shared/dashboard-nav'
import { TopBar } from '@/components/shared/top-bar'
import { RealtimeSubscriber } from '@/components/shared/realtime-subscriber'
import { Suspense } from 'react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all rooms for the sidebar nav
  const { data: memberships } = await supabase
    .from('room_members')
    .select('role, status, rooms(id, name, invite_code)')
    .eq('user_id', user.id)

  const activeMemberships = (memberships || []).filter((m: any) => m.status === 'active' || !m.status)

  const allRooms = activeMemberships.map((m: any) => {
    const roomObj = Array.isArray(m.rooms) ? m.rooms[0] : m.rooms
    return {
      id: roomObj?.id,
      name: roomObj?.name,
      invite_code: roomObj?.invite_code,
      role: m.role,
    }
  }).filter((r: any) => r.id)

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50 dark:bg-gray-900">

      {/* Sidebar — hidden on mobile, visible md+ */}
      <aside className="hidden md:flex w-64 border-r bg-white dark:bg-gray-950 flex-col shrink-0">

        {/* App branding */}
        <div className="p-6 border-b shrink-0">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Roommates
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Shared Expense Tracker</p>
        </div>

        {/* Nav (includes room switcher, links, and sign out) */}
        <Suspense fallback={<div className="flex-1" />}>
          <DashboardNav allRooms={allRooms} />
        </Suspense>

      </aside>

      {/* Main content */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <RealtimeSubscriber />
        <Suspense fallback={<div className="h-16 border-b" />}>
          <TopBar allRooms={allRooms} />
        </Suspense>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </main>

    </div>
  )
}
