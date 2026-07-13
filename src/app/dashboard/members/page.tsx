import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Crown, User } from 'lucide-react'
import { cookies } from 'next/headers'
import { formatDate } from '@/lib/nepali'

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const colors = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
  ]
  const color = colors[(name.charCodeAt(0) || 0) % colors.length]
  const sz = size === 'sm' ? 'w-9 h-9 text-sm' : 'w-11 h-11 text-base'
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {name[0]?.toUpperCase() || '?'}
    </div>
  )
}

export default async function MembersPage({
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

  const allRooms = (memberships || [])
  if (allRooms.length === 0) redirect('/dashboard')

  const allRoomIds = allRooms.map((m: any) => m.room_id)
  const roomId = (roomParam && allRoomIds.includes(roomParam))
    ? roomParam
    : allRoomIds[0]

  const currentMembership = allRooms.find((m: any) => m.room_id === roomId)
  const isAdmin = currentMembership?.role === 'admin'

  // Parallel fetches
  const [roomRes, membersRes, cookieStore] = await Promise.all([
    supabase.from('rooms').select('name, invite_code').eq('id', roomId).single(),
    supabase
      .from('room_members')
      .select('role, status, joined_at, user_id, users(name, avatar_url)')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true }),
    cookies(),
  ])

  const room = roomRes.data
  const memberList = membersRes.data || []
  
  const pendingMembers = memberList.filter((m: any) => m.status === 'pending')
  const activeMembers = memberList.filter((m: any) => m.status === 'active' || !m.status)
  
  const admins = activeMembers.filter((m: any) => m.role === 'admin')
  const regularMembers = activeMembers.filter((m: any) => m.role === 'member')
  const useNepali = cookieStore.get('useNepali')?.value !== 'false'

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Room Members</h1>
        <p className="text-muted-foreground mt-1">
          {memberList.length} {memberList.length === 1 ? 'person' : 'people'} in <span className="font-medium text-foreground">{room?.name}</span>
        </p>
      </div>

      {/* Invite code card */}
      <div className="rounded-xl border bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border-indigo-200 dark:border-indigo-800/40 p-5">
        <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 mb-1">Room Invite Code</p>
        <p className="text-xs text-indigo-600/70 dark:text-indigo-500/70 mb-3">Share this code with roommates so they can join.</p>
        <span className="font-mono text-2xl font-bold tracking-widest text-indigo-800 dark:text-indigo-300 bg-white dark:bg-indigo-950/50 px-4 py-2 rounded-lg border border-indigo-200 dark:border-indigo-700/50 select-all">
          {room?.invite_code}
        </span>
      </div>

      {/* Pending Requests */}
      {isAdmin && pendingMembers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-500 px-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Pending Approval ({pendingMembers.length})
          </h2>
          <div className="space-y-2">
            {pendingMembers.map((m: any) => {
              const name = m.users?.name || 'Unknown'
              return (
                <div key={m.user_id} className="flex items-center gap-4 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20">
                  <Avatar name={name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{name}</p>
                    <p className="text-sm text-muted-foreground">Wants to join</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <form action={async (fd) => {
                      'use server'
                      const { rejectMember } = await import('@/app/dashboard/actions')
                      await rejectMember(fd)
                    }}>
                      <input type="hidden" name="roomId" value={roomId} />
                      <input type="hidden" name="targetUserId" value={m.user_id} />
                      <button type="submit" className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 rounded-md transition-colors">
                        Reject
                      </button>
                    </form>
                    <form action={async (fd) => {
                      'use server'
                      const { approveMember } = await import('@/app/dashboard/actions')
                      await approveMember(fd)
                    }}>
                      <input type="hidden" name="roomId" value={roomId} />
                      <input type="hidden" name="targetUserId" value={m.user_id} />
                      <button type="submit" className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-sm">
                        Approve
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Admins */}
      {admins.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
            Admin{admins.length > 1 ? 's' : ''}
          </h2>
          <div className="space-y-2">
            {admins.map((m: any) => {
              const name = m.users?.name || 'Unknown'
              const isYou = m.user_id === user!.id
              return (
                <div key={m.user_id} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all duration-200">
                  <Avatar name={name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{name}</p>
                      {isYou && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">You</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Joined {formatDate(m.joined_at, useNepali)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 shrink-0">
                    <Crown className="w-4 h-4" />
                    <span className="text-xs font-medium">Admin</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Regular Members */}
      {regularMembers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">Members</h2>
          <div className="space-y-2">
            {regularMembers.map((m: any) => {
              const name = m.users?.name || 'Unknown'
              const isYou = m.user_id === user!.id
              return (
                <div key={m.user_id} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all duration-200">
                  <Avatar name={name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{name}</p>
                      {isYou && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">You</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Joined {formatDate(m.joined_at, useNepali)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                    <User className="w-4 h-4" />
                    <span className="text-xs font-medium">Member</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {memberList.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-medium">No members found</p>
          <p className="text-sm mt-1">Share the invite code above to get started.</p>
        </div>
      )}
    </div>
  )
}
