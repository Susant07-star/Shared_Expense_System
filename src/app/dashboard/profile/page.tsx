import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User, Save, Plus, LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createRoom, joinRoom, updateUserProfile } from '@/app/dashboard/actions'
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
