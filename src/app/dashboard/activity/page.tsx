import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Activity, Receipt, HandCoins } from 'lucide-react'
import { cookies } from 'next/headers'
import { formatAmount, formatDate } from '@/lib/nepali'

function Avatar({ name }: { name: string }) {
  const colors = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
  ]
  const color = colors[(name.charCodeAt(0) || 0) % colors.length]
  return (
    <div className={`w-10 h-10 text-sm ${color} rounded-full flex items-center justify-center font-bold shrink-0 z-10 relative ring-4 ring-background`}>
      {name[0]?.toUpperCase() || '?'}
    </div>
  )
}

function ActionIcon({ type }: { type: string }) {
  if (type === 'expense_added') {
    return <div className="absolute -bottom-1 -right-1 bg-blue-100 text-blue-600 p-1 rounded-full ring-2 ring-background z-20"><Receipt className="w-3 h-3" /></div>
  }
  if (type === 'settled_up') {
    return <div className="absolute -bottom-1 -right-1 bg-emerald-100 text-emerald-600 p-1 rounded-full ring-2 ring-background z-20"><HandCoins className="w-3 h-3" /></div>
  }
  return <div className="absolute -bottom-1 -right-1 bg-slate-100 text-slate-600 p-1 rounded-full ring-2 ring-background z-20"><Activity className="w-3 h-3" /></div>
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>
}) {
  const supabase = await createClient()
  const { room: roomParam } = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get all memberships and resolve the selected room from query param
  const { data: memberships } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', user.id)

  const allRoomIds = (memberships || []).map((m: any) => m.room_id)
  if (allRoomIds.length === 0) redirect('/dashboard')

  const roomId = (roomParam && allRoomIds.includes(roomParam))
    ? roomParam
    : allRoomIds[0]

  // Parallel fetches for speed
  const [logsRes, cookieStore] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('*, users!activity_logs_user_id_fkey(name)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(50),
    cookies(),
  ])

  const activityList = logsRes.data || []
  const useNepali = cookieStore.get('useNepali')?.value !== 'false'

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-rose-100 dark:bg-rose-900/50 rounded-full text-rose-600 dark:text-rose-300">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Activity Feed</h1>
          <p className="text-muted-foreground mt-1">Everything that happens in your room.</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-2">
        <div className="absolute left-[26px] top-4 bottom-4 w-px bg-border z-0" />
        <div className="space-y-6">
          {activityList.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground bg-card border rounded-2xl ml-8">
              <div className="text-4xl mb-4">📭</div>
              <p className="font-medium text-foreground">Quiet in here...</p>
              <p className="text-sm mt-1">Activities will appear once expenses are added or settled.</p>
            </div>
          ) : (
            activityList.map((log: any, idx: number) => {
              const name = log.user_id === user!.id ? 'You' : (log.users?.name || 'Someone')
              const isYou = log.user_id === user!.id
              const time = new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              const date = formatDate(log.created_at, useNepali)

              return (
                <div
                  key={log.id}
                  className="relative flex items-start gap-5 group"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="relative">
                    <Avatar name={log.users?.name || '?'} />
                    <ActionIcon type={log.action_type} />
                  </div>

                  <div className="flex-1 bg-card border rounded-2xl p-4 shadow-sm hover:shadow transition-shadow group-hover:border-slate-300 dark:group-hover:border-slate-700">
                    <div className="flex justify-between items-start gap-4">
                      <p className="text-sm leading-relaxed">
                        <span className={`font-semibold ${isYou ? 'text-foreground' : ''}`}>{name}</span>
                        {' '}
                        {log.action_type === 'expense_added' && 'added a new expense'}
                        {log.action_type === 'settled_up' && 'settled up a balance'}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{date}, {time}</span>
                    </div>

                    {log.metadata && (
                      <div className="mt-3">
                        {log.action_type === 'expense_added' && (
                          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                            <p className="font-medium text-slate-800 dark:text-slate-200">"{log.metadata.description}"</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                              Cost <span className="font-semibold text-slate-700 dark:text-slate-300">{formatAmount(Number(log.metadata.amount), useNepali)}</span>
                              {log.metadata.type === 'shared' ? ' (Shared)' : ' (Personal)'}
                            </p>
                          </div>
                        )}
                        {log.action_type === 'settled_up' && (
                          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/40">
                            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                              Paid <span className="font-bold">{formatAmount(Number(log.metadata.amount), useNepali)}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
