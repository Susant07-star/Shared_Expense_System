import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { signout } from '../(auth)/actions'
import { Button } from '@/components/ui/button'
import { DashboardNav } from '@/components/shared/dashboard-nav'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params?: any
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all rooms for the sidebar
  const { data: memberships } = await supabase
    .from('room_members')
    .select('role, rooms(id, name, invite_code)')
    .eq('user_id', user.id)

  const allRooms = (memberships || []).map((m: any) => ({
    id: m.rooms?.id,
    name: m.rooms?.name,
    invite_code: m.rooms?.invite_code,
    role: m.role,
  })).filter(r => r.id)

  // We read the selected room from the URL server-side via the children,
  // but pass the full list. Room selection happens on the page level.
  const selectedRoomId = allRooms[0]?.id ?? ''

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white dark:bg-gray-950 flex flex-col hidden md:flex shrink-0">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Roommates
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Shared Expense Tracker</p>
        </div>

        <DashboardNav allRooms={allRooms} selectedRoomId={selectedRoomId} />

        <div className="p-4 border-t">
          <form action={signout}>
            <Button variant="ghost" className="w-full justify-start gap-3 text-sm text-gray-600 dark:text-gray-400" type="submit">
              <LogOut className="w-5 h-5 shrink-0" /> Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
