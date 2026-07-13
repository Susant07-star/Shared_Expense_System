import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
        <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-amber-600 dark:text-amber-500 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  Pending Approval
                </CardTitle>
                <CardDescription>You have requested to join one or more rooms. Please wait for an admin to approve your request.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingRooms.map(r => (
                    <div key={r.id} className="p-3 bg-muted rounded-lg font-medium">
                      {r.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <form action={signout}>
              <Button variant="ghost" className="w-full" type="submit">Sign out</Button>
            </form>
          </div>
        </div>
      )
    }

    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Welcome!</CardTitle>
              <CardDescription>Create your first room or join one with an invite code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={createRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomName">Create a New Room</Label>
                  <Input id="roomName" name="roomName" placeholder="e.g. My Awesome Apartment" required />
                </div>
                <Button type="submit" className="w-full">Create Room</Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <form action={joinRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Join with Invite Code</Label>
                  <Input id="inviteCode" name="inviteCode" placeholder="Enter code" required />
                </div>
                <Button type="submit" variant="secondary" className="w-full">Join Room</Button>
              </form>
            </CardContent>
          </Card>

          <form action={signout}>
            <Button variant="ghost" className="w-full" type="submit">Sign out</Button>
          </form>
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
  const [membersRes, recentExpensesRes, balances, cookieStore] = await Promise.all([
    supabase
      .from('room_members')
      .select('user_id, users(name)')
      .eq('room_id', selectedRoomId),
    supabase
      .from('expenses')
      .select('id, description, amount, type, created_at, payer_id, users!expenses_payer_id_fkey(name)')
      .eq('room_id', selectedRoomId)
      .order('created_at', { ascending: false })
      .limit(5),
    calculateBalances(selectedRoomId),
    cookies(),
  ])

  const memberNames: Record<string, string> = {}
  membersRes.data?.forEach((m: any) => {
    memberNames[m.user_id] = m.users?.name || 'Unknown'
  })

  const recentExpenses = recentExpensesRes.data || []

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
