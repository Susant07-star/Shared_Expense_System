import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Receipt } from 'lucide-react'
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
    <div className={`w-11 h-11 text-base ${color} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {name[0]?.toUpperCase() || '?'}
    </div>
  )
}

export default async function ExpensesPage({
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
    .select('room_id')
    .eq('user_id', user.id)

  const allRoomIds = (memberships || []).map((m: any) => m.room_id)
  if (allRoomIds.length === 0) redirect('/dashboard')

  const roomId = (roomParam && allRoomIds.includes(roomParam))
    ? roomParam
    : allRoomIds[0]

  // Parallel fetches
  const [expensesRes, cookieStore] = await Promise.all([
    supabase
      .from('expenses')
      .select(`
        id, amount, description, type, created_at, payer_id,
        users!expenses_payer_id_fkey(name)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false }),
    cookies(),
  ])

  const expList = expensesRes.data || []
  const useNepali = cookieStore.get('useNepali')?.value !== 'false'

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full text-indigo-600 dark:text-indigo-300">
          <Receipt className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">All Expenses</h1>
          <p className="text-muted-foreground mt-1">
            {expList.length} total expense{expList.length !== 1 ? 's' : ''} in this room.
          </p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {expList.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-card border rounded-2xl">
            <div className="text-4xl mb-4">🧾</div>
            <p className="font-medium text-foreground">No expenses yet</p>
            <p className="text-sm mt-1">When expenses are added, they will appear here.</p>
          </div>
        ) : (
          expList.map((exp: any, idx: number) => {
            const payerName = exp.payer_id === user!.id ? 'You' : (exp.users?.name || 'Someone')
            const isYou = exp.payer_id === user!.id

            return (
              <div
                key={exp.id}
                className="flex items-center gap-4 p-4 md:p-5 rounded-2xl border bg-card hover:bg-muted/30 transition-all duration-200 hover:shadow-sm"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <Avatar name={exp.users?.name || '?'} />

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-base">{exp.description}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Paid by <span className={isYou ? 'font-medium text-foreground' : ''}>{payerName}</span>
                    <span className="mx-2 opacity-50">•</span>
                    {formatDate(exp.created_at, useNepali)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-lg tabular-nums">{formatAmount(Number(exp.amount), useNepali)}</p>
                  <span className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    exp.type === 'shared'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {exp.type === 'shared' ? 'Shared Split' : 'Personal'}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
