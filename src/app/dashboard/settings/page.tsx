import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Settings, Save, LogOut, Plus, LogIn, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateRoomName, leaveRoom, deleteRoom } from '@/app/dashboard/actions'
import { SecurityToggle } from '@/components/security-toggle'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from '@/components/ui/dialog'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>
}) {
  const supabase = await createClient()
  const { room: roomParam } = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('room_members')
    .select('room_id, role')
    .eq('user_id', user.id)

  const allRooms = memberships || []
  if (allRooms.length === 0) redirect('/dashboard')

  const allRoomIds = allRooms.map((m: any) => m.room_id)
  const roomId = (roomParam && allRoomIds.includes(roomParam))
    ? roomParam
    : allRoomIds[0]

  const currentMembership = allRooms.find((m: any) => m.room_id === roomId)
  const isAdmin = currentMembership?.role === 'admin'

  const { data: room } = await supabase
    .from('rooms')
    .select('name, require_approval')
    .eq('id', roomId)
    .single()

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage current room and your joined rooms.</p>
        </div>
      </div>

      <div className="space-y-6">

        {/* Rename Room */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold">Room Profile</h2>
          <p className="text-sm text-muted-foreground mb-4">Change the name of your current room.</p>

          <form action={updateRoomName} className="space-y-4 max-w-md">
            <input type="hidden" name="roomId" value={roomId} />
            <div className="space-y-2">
              <Label htmlFor="roomName">Room Name</Label>
              <Input
                id="roomName"
                name="roomName"
                defaultValue={room?.name || ''}
                disabled={!isAdmin}
                required
              />
              {!isAdmin && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Only room admins can change the room name.</p>
              )}
            </div>

            {isAdmin && (
              <Button type="submit" className="gap-2">
                <Save className="w-4 h-4" /> Save Changes
              </Button>
            )}
          </form>
        </div>

        {/* Security Settings */}
        {isAdmin && (
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold">Security</h2>
            <p className="text-sm text-muted-foreground mb-4">Control how new members join this room.</p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
              <div className="space-y-1 flex-1">
                <Label htmlFor="requireApproval" className="text-base">Require Admin Approval</Label>
                <p className="text-xs text-muted-foreground">New members will be pending until an admin approves them.</p>
              </div>

              <div className="flex items-center gap-4">
                <SecurityToggle roomId={roomId} initialValue={room?.require_approval || false} />
              </div>
            </div>
          </div>
        )}


        {/* Danger Zone */}
        <div className="border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-rose-700 dark:text-rose-400">Danger Zone</h2>
            <p className="text-sm text-rose-600/70 dark:text-rose-400/70 mb-4">Leave this room. You will need a new invite code to rejoin.</p>
            <Dialog>
              <DialogTrigger render={
                <Button variant="destructive" className="gap-2">
                  <LogOut className="w-4 h-4" /> Leave Room
                </Button>
              } />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Leave Room</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to leave this room? You will no longer be able to see expenses or activity until you are invited back.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                  <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                  <form action={leaveRoom}>
                    <input type="hidden" name="roomId" value={roomId} />
                    <Button type="submit" variant="destructive">Confirm Leave</Button>
                  </form>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isAdmin && (
            <div className="pt-6 border-t border-rose-200/50 dark:border-rose-900/50">
              <p className="text-sm text-rose-600/70 dark:text-rose-400/70 mb-4 font-medium">Delete this room completely. This action cannot be undone.</p>
              <Dialog>
                <DialogTrigger render={
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="w-4 h-4" /> Delete Room
                  </Button>
                } />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Room</DialogTitle>
                    <DialogDescription>
                      Are you absolutely sure you want to delete this room? This will permanently delete all expenses, members, and activity logs. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="mt-4">
                    <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                    <form action={deleteRoom}>
                      <input type="hidden" name="roomId" value={roomId} />
                      <Button type="submit" variant="destructive">Confirm Delete</Button>
                    </form>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
