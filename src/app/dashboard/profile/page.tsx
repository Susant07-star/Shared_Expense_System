import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User, Save, Plus, LogIn, LogOut, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createRoom, joinRoom, updateUserProfile, cancelJoinRequest } from '@/app/dashboard/actions'
import { signout } from '@/app/(auth)/actions'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch pending room requests
  const { data: pendingMemberships } = await supabase
    .from('room_members')
    .select('room_id, status, rooms(name)')
    .eq('user_id', user.id)
    .eq('status', 'pending')

  const pendingRequests = pendingMemberships?.map((m: any) => ({
    id: m.room_id,
    name: m.rooms?.name || 'Unknown Room',
  })) || []

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-full text-indigo-600 dark:text-indigo-300">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information and rooms.</p>
        </div>
      </div>

      <div className="space-y-6">

        {/* User Profile */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold">Personal Information</h2>
          <p className="text-sm text-muted-foreground mb-4">Update your display name.</p>

          <form action={updateUserProfile} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={userProfile?.name || ''}
                required
              />
            </div>

            <Button type="submit" className="gap-2">
              <Save className="w-4 h-4" /> Save Profile
            </Button>
          </form>
        </div>

        {/* Manage Rooms */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold">Manage Rooms</h2>
          <p className="text-sm text-muted-foreground mb-6">Create a new room or join an existing one.</p>

          <div className="grid md:grid-cols-2 gap-6">
            <form action={createRoom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newRoomName">Create a New Room</Label>
                <Input id="newRoomName" name="roomName" placeholder="e.g. My Apartment" required />
              </div>
              <Button type="submit" variant="secondary" className="w-full gap-2">
                <Plus className="w-4 h-4" /> Create Room
              </Button>
            </form>

            <form action={joinRoom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Join with Invite Code</Label>
                <Input id="inviteCode" name="inviteCode" placeholder="Enter code" required />
              </div>
              <Button type="submit" variant="secondary" className="w-full gap-2">
                <LogIn className="w-4 h-4" /> Join Room
              </Button>
            </form>
          </div>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Clock className="w-5 h-5" /> Pending Room Requests
              </h2>
              <p className="text-sm text-amber-600/70 dark:text-amber-400/70 mt-1">You are waiting for an admin to approve your request to join these rooms.</p>
            </div>
            
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900 p-3 rounded-xl shadow-sm">
                  <div>
                    <p className="font-semibold text-sm">{req.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Status: <span className="text-amber-600 dark:text-amber-500 font-medium">Pending Approval</span></p>
                  </div>
                  <form action={cancelJoinRequest}>
                    <input type="hidden" name="roomId" value={req.id} />
                    <Button type="submit" variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Account Actions */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold">Account Actions</h2>
          <form action={signout}>
            <Button variant="outline" type="submit" className="gap-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </form>
        </div>

      </div>
    </div>
  )
}
