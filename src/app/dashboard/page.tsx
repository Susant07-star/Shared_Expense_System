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
    .select('room_id, role, rooms(id, name, invite_code)')
    .eq('user_id', user.id)

  if (membershipsError) {
    throw new Error(`Memberships fetch error: ${membershipsError.message}`)
  }

  const allRooms = (memberships || []).map((m: any) => ({
    id: m.rooms?.id,
    name: m.rooms?.name,
    invite_code: m.rooms?.invite_code,
    role: m.role,
  })).filter(r => r.id)

  const hasRooms = allRooms.length > 0

  if (!hasRooms) {
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
  const selectedRoomId = resolvedParams.room && allRooms.some(r => r.id === resolvedParams.room)
    ? resolvedParams.room
    : allRooms[0].id

  const roomDetails = allRooms.find(r => r.id === selectedRoomId)!

  // Fetch room members
  const { data: members } = await supabase
    .from('room_members')
    .select('user_id, users(name)')
    .eq('room_id', selectedRoomId)

  const memberNames: Record<string, string> = {}
  members?.forEach((m: any) => {
    memberNames[m.user_id] = m.users?.name || 'Unknown'
  })

  // Fetch recent expenses
  const { data: recentExpenses } = await supabase
    .from('expenses')
    .select('id, description, amount, type, created_at, payer_id, users!expenses_payer_id_fkey(name)')
    .eq('room_id', selectedRoomId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Calculate balances
  const balances = await calculateBalances(selectedRoomId)

  const totalOwedToMe = balances
    .filter((b: any) => b.to === user.id)
    .reduce((sum: number, b: any) => sum + b.amount, 0)
  const totalIOwe = balances
    .filter((b: any) => b.from === user.id)
    .reduce((sum: number, b: any) => sum + b.amount, 0)

  const cookieStore = await cookies()
  // Default to Nepali (true) if not set
  const initialUseNepali = cookieStore.get('useNepali')?.value !== 'false'

  return (
    <DashboardView
      roomId={selectedRoomId}
      roomName={roomDetails.name}
      inviteCode={roomDetails.invite_code}
      allRooms={allRooms}
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
