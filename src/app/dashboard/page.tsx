import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signout } from '../(auth)/actions'
import { createRoom, joinRoom } from './actions'
import { DashboardView } from '@/components/dashboard-view'
import { calculateBalances } from '@/lib/balances'
import { cookies } from 'next/headers'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>
}) {
  const supabase = await createClient()
  const resolvedParams = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Ensure user exists in public.users
  const { data: userProfile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    await supabase.from('users').insert([{
      id: user.id,
      name: user.user_metadata?.full_name || 'New User',
      avatar_url: user.user_metadata?.avatar_url || null
    }])
  }

  // Get ALL rooms the user belongs to
  const { data: memberships, error: membershipsError } = await supabase
    .from('room_members')
    .select('room_id, role, status, rooms(id, name, invite_code)')
    .eq('user_id', user.id)

  if (membershipsError) {
    throw new Error(`Memberships fetch error: ${membershipsError.message}`)
  }

  const rawMemberships = memberships || []
  
  const activeRooms = rawMemberships
    .filter((m: any) => m.status === 'active' || !m.status)
    .map((m: any) => ({
      id: m.rooms?.id,
      name: m.rooms?.name,
      invite_code: m.rooms?.invite_code,
      role: m.role,
    })).filter(r => r.id)

  const pendingRooms = rawMemberships
    .filter((m: any) => m.status === 'pending')
    .map((m: any) => ({
      id: m.rooms?.id,
      name: m.rooms?.name,
    })).filter(r => r.id)

  const hasActiveRooms = activeRooms.length > 0

  if (!hasActiveRooms) {
    if (pendingRooms.length > 0) {
      return (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-sm w-full text-center space-y-6">
            <div className="text-6xl">⏳</div>
            <div>
              <h2 className="text-xl font-bold">Waiting for Approval</h2>
              <p className="text-muted-foreground text-sm mt-2">
                Your request to join these rooms is pending. An admin will approve you shortly.
              </p>
            </div>
            <div className="space-y-2 text-left">
              {pendingRooms.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <p className="font-medium text-sm text-amber-800 dark:text-amber-300">{r.name}</p>
                  <span className="ml-auto text-xs text-amber-600 dark:text-amber-500">Pending</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              You can manage your pending requests in{' '}
              <a href="/dashboard/profile" className="text-indigo-600 hover:underline font-medium">Profile Settings</a>.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="text-6xl">🏠</div>
          <div>
            <h2 className="text-xl font-bold">No Rooms Yet</h2>
            <p className="text-muted-foreground text-sm mt-2">
              Create a new room to start tracking shared expenses, or join an existing one with an invite code.
            </p>
          </div>
          <div className="space-y-3">
            <form action={createRoom} className="space-y-2">
              <Input name="roomName" placeholder="e.g. My Apartment" required />
              <Button type="submit" className="w-full gap-2">
                <span>+</span> Create a Room
              </Button>
            </form>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <form action={joinRoom} className="space-y-2">
              <Input name="inviteCode" placeholder="Enter invite code" required />
              <Button type="submit" variant="secondary" className="w-full">Join a Room</Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Determine which room to show (from query param or default to first)
  const selectedRoomId = resolvedParams.room && activeRooms.some(r => r.id === resolvedParams.room)
    ? resolvedParams.room
    : activeRooms[0].id

  const roomDetails = activeRooms.find(r => r.id === selectedRoomId)!

  // Parallel fetches for speed
  const [membersRes, recentExpensesRes, pendingExpensesRes, balances, cookieStore] = await Promise.all([
    supabase
      .from('room_members')
      .select('user_id, users(name)')
      .eq('room_id', selectedRoomId),
    supabase
      .from('expenses')
      .select('id, amount, description, type, created_at, created_by, payer_id, users!expenses_payer_id_fkey(name)')
      .eq('room_id', selectedRoomId)
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('expenses')
      .select('id, amount, description, type, created_at, created_by, users!expenses_created_by_fkey(name)')
      .eq('room_id', selectedRoomId)
      .eq('payer_id', user.id)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false }),
    calculateBalances(selectedRoomId),
    cookies(),
  ])

  const memberNames: Record<string, string> = {}
  membersRes.data?.forEach((m: any) => {
    memberNames[m.user_id] = m.users?.name || 'Unknown'
  })

  const recentExpenses = recentExpensesRes.data || []
  const pendingExpenses = pendingExpensesRes.data || []

  const totalOwedToMe = balances
    .filter((b: any) => b.to === user.id)
    .reduce((sum: number, b: any) => sum + b.amount, 0)
  const totalIOwe = balances
    .filter((b: any) => b.from === user.id)
    .reduce((sum: number, b: any) => sum + b.amount, 0)

  // Default to Nepali (true) if not explicitly set to 'false'
  const initialUseNepali = cookieStore.get('useNepali')?.value !== 'false'

  return (
    <DashboardView
      roomId={selectedRoomId}
      roomName={roomDetails.name}
      inviteCode={roomDetails.invite_code}
      allRooms={activeRooms}
      recentExpenses={recentExpenses || []}
      pendingExpenses={pendingExpenses || []}
      balances={balances || []}
      currentUserId={user.id}
      currentUserName={memberNames[user.id] || 'You'}
      memberNames={memberNames}
      totalOwedToMe={totalOwedToMe}
      totalIOwe={totalIOwe}
      initialUseNepali={initialUseNepali}
    />
  )
}
