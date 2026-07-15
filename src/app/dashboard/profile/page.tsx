import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User, Save, Plus, LogIn, LogOut, Clock, X, Crown, Users, Trash2, DoorOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createRoom, joinRoom, updateUserProfile, cancelJoinRequest, leaveRoom, deleteRoom } from '@/app/dashboard/actions'
import { signout } from '@/app/(auth)/actions'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from '@/components/ui/dialog'
import Link from 'next/link'
import { ExpenseSettingsForm } from '@/components/expense-settings-form'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch all memberships (active + pending)
  const { data: allMemberships } = await supabase
    .from('room_members')
    .select('room_id, role, status, joined_at, rooms(id, name, invite_code)')
    .eq('user_id', user.id)

  const activeRooms = (allMemberships || [])
    .filter((m: any) => m.status === 'active' || !m.status)
    .map((m: any) => {
      const roomObj = Array.isArray(m.rooms) ? m.rooms[0] : m.rooms
      return {
        id: roomObj?.id,
        name: roomObj?.name || 'Unknown',
        invite_code: roomObj?.invite_code,
        role: m.role,
        joined_at: m.joined_at,
      }
    })
    .filter((r: any) => r.id)

  const pendingRequests = (allMemberships || [])
    .filter((m: any) => m.status === 'pending')
    .map((m: any) => {
      const roomObj = Array.isArray(m.rooms) ? m.rooms[0] : m.rooms
      return {
        id: roomObj?.id,
        name: roomObj?.name || 'Unknown Room',
      }
    })
    .filter((r: any) => r.id)

  const adminRooms = activeRooms.filter(r => r.role === 'admin')
  const memberRooms = activeRooms.filter(r => r.role === 'member')

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

        {/* Expense Settings */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold">Expense Settings</h2>
          <p className="text-sm text-muted-foreground mb-6">Manage how others can add expenses involving you.</p>
          <ExpenseSettingsForm 
            initialAllowOthers={userProfile?.allow_others_to_add ?? true}
            initialRequireApproval={userProfile?.require_expense_approval ?? true}
          />
        </div>

        {/* My Rooms */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" /> My Rooms
            </h2>
            <p className="text-sm text-muted-foreground mt-1">All rooms you are currently in.</p>
          </div>

          {activeRooms.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">You are not in any room yet.</p>
          ) : (
            <div className="space-y-3">
              {activeRooms.map(room => {
                const isAdmin = room.role === 'admin'
                return (
                  <div
                    key={room.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      isAdmin
                        ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/10'
                        : 'border-border bg-muted/20'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`p-2 rounded-full shrink-0 ${isAdmin ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {isAdmin ? <Crown className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard?room=${room.id}`}
                          className="font-semibold text-sm hover:underline truncate"
                        >
                          {room.name}
                        </Link>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                          isAdmin
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {isAdmin ? 'Admin' : 'Member'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{room.invite_code}</p>
                    </div>

                    {/* Action */}
                    {isAdmin ? (
                      // DELETE button for admins
                      <Dialog>
                        <DialogTrigger render={
                          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-lg transition-colors shrink-0">
                            <Trash2 className="w-3.5 h-3.5" /> Delete Room
                          </button>
                        } />
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Room?</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to permanently delete <span className="font-semibold text-foreground">{room.name}</span>? This will remove all members, expenses, and balances. This action <span className="text-rose-600 font-semibold">cannot be undone</span>.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose render={<Button variant="ghost">Cancel</Button>} />
                            <form action={deleteRoom}>
                              <input type="hidden" name="roomId" value={room.id} />
                              <input type="hidden" name="redirectTo" value="/dashboard/profile" />
                              <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">
                                Yes, Delete Room
                              </Button>
                            </form>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      // LEAVE button for members
                      <Dialog>
                        <DialogTrigger render={
                          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shrink-0">
                            <DoorOpen className="w-3.5 h-3.5" /> Leave Room
                          </button>
                        } />
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Leave Room?</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to leave <span className="font-semibold text-foreground">{room.name}</span>? You can rejoin later using the invite code.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose render={<Button variant="ghost">Cancel</Button>} />
                            <form action={leaveRoom}>
                              <input type="hidden" name="roomId" value={room.id} />
                              <input type="hidden" name="redirectTo" value="/dashboard/profile" />
                              <Button type="submit" variant="outline">Yes, Leave Room</Button>
                            </form>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )
              })}
            </div>
          )}
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

        {/* Create / Join */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-1">Join or Create a Room</h2>
          <p className="text-sm text-muted-foreground mb-6">Create a new room or join an existing one with an invite code.</p>

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
