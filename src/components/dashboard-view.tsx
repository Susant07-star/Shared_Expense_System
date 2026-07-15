'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus, TrendingUp, TrendingDown, Minus, ArrowRight,
  Copy, Check, ChevronDown, DollarSign, BadgeCent, UserCircle,
} from 'lucide-react'
import { addExpense, settleUp, settleAllBalances, setNepaliMode, approveExpense, rejectExpense } from '@/app/dashboard/actions'
import { formatDate, formatAmount } from '@/lib/nepali'
import Link from 'next/link'
import { SettleButton } from '@/components/settle-button'

type Room = { id: string; name: string; invite_code: string; role: string }

export type OfflineExpense = {
  id: string
  description: string
  amount: string
  displayAmount: string
  payerId: string
  roomId: string
  splitWith?: string
  date: string
}

// ─── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const colors = [
    'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
    'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  ]
  const color = colors[(name.charCodeAt(0) || 0) % colors.length]
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-bold shrink-0 transition-transform duration-200 hover:scale-105`}>
      {name[0]?.toUpperCase() || '?'}
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  label, amount, type, delay = 0, useNepali,
}: {
  label: string; amount: number; type: 'positive' | 'negative' | 'neutral'; delay?: number; useNepali: boolean
}) {
  const styles = {
    positive: {
      card: 'border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30',
      amount: 'text-emerald-700 dark:text-emerald-400',
      label: 'text-emerald-600 dark:text-emerald-500',
      icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
    },
    negative: {
      card: 'border-rose-200 dark:border-rose-800/50 bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30',
      amount: 'text-rose-700 dark:text-rose-400',
      label: 'text-rose-600 dark:text-rose-500',
      icon: <TrendingDown className="w-5 h-5 text-rose-500" />,
    },
    neutral: {
      card: 'border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/30 dark:to-slate-900/30',
      amount: 'text-slate-700 dark:text-slate-300',
      label: 'text-slate-500 dark:text-slate-400',
      icon: <Minus className="w-5 h-5 text-slate-400" />,
    },
  }
  const s = styles[type]
  return (
    <Card
      className={`${s.card} transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="pb-1 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-xs font-semibold uppercase tracking-wide ${s.label}`}>{label}</CardTitle>
          {s.icon}
        </div>
      </CardHeader>
      <CardContent className="pb-4 px-5">
        <div className={`text-2xl font-bold tracking-tight ${s.amount}`}>
          {amount === 0
            ? <span className="text-xl opacity-60">All clear ✓</span>
            : formatAmount(amount, useNepali)
          }
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function DashboardView({
  roomName, inviteCode, roomId, allRooms, recentExpenses, pendingExpenses, balances,
  currentUserId, currentUserName, memberNames, totalOwedToMe, totalIOwe, initialUseNepali,
}: {
  roomName: string
  inviteCode: string
  roomId: string
  allRooms: Room[]
  recentExpenses: any[]
  pendingExpenses: any[]
  balances: any[]
  currentUserId: string
  currentUserName: string
  memberNames: Record<string, string>
  totalOwedToMe: number
  totalIOwe: number
  initialUseNepali: boolean
}) {
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isCurrencyPending, startCurrencyTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  // ─── Offline Sync Queue ───────────────────────────────────────────────────
  const [offlineQueue, setOfflineQueue] = useState<OfflineExpense[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(`offlineQueue_${roomId}`)
    if (stored) {
      try {
        setOfflineQueue(JSON.parse(stored))
      } catch (e) {}
    }
  }, [roomId])

  useEffect(() => {
    localStorage.setItem(`offlineQueue_${roomId}`, JSON.stringify(offlineQueue))
  }, [offlineQueue, roomId])

  useEffect(() => {
    const syncQueue = async () => {
      if (offlineQueue.length === 0) return
      
      const toProcess = [...offlineQueue]
      setOfflineQueue([]) // Clear immediately to prevent double processing
      
      for (const item of toProcess) {
        const fd = new FormData()
        fd.append('roomId', item.roomId)
        fd.append('description', item.description)
        fd.append('amount', item.amount)
        fd.append('displayAmount', item.displayAmount)
        fd.append('payerId', item.payerId)
        if (item.splitWith) fd.append('splitWith', item.splitWith)
        
        try {
          await addExpense(fd)
        } catch (err) {
          // If it fails (still offline), put it back
          setOfflineQueue(prev => [...prev, item])
        }
      }
    }

    const handleOnline = () => {
      syncQueue()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [offlineQueue])

  // Track selected payer to fix Radix UI Select rendering raw IDs
  const [selectedPayer, setSelectedPayer] = useState(currentUserId)

  // Custom split: which members to include in the split
  const allMemberIds = Object.keys(memberNames)
  const [splitWith, setSplitWith] = useState<string[]>(allMemberIds)
  const [splitType, setSplitType] = useState<'shared' | 'personal'>('shared')

  // Amount input for live split preview
  const [expenseAmount, setExpenseAmount] = useState<number>(0)

  const toggleMember = (id: string) => {
    setSplitWith(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(m => m !== id) : prev // at least 1
        : [...prev, id]
    )
  }

  const resetForm = () => {
    setSelectedPayer(currentUserId)
    setSplitWith(allMemberIds)
    setSplitType('shared')
    setExpenseAmount(0)
  }

  // NPR/BS is the default (initialUseNepali=true from server cookie default)
  const [useNepali, setUseNepali] = useState(initialUseNepali)

  const netBalance = totalOwedToMe - totalIOwe
  const netLabel = netBalance >= 0 ? 'You are ahead by' : 'You are behind by'

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCurrencyChange = (val: boolean) => {
    setUseNepali(val)
    startCurrencyTransition(() => {
      setNepaliMode(val)
    })
  }

  // NPR conversion rate (stored amounts are in USD internally)
  const NPR_RATE = 135

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{roomName}</h1>
          <button
            onClick={copyInviteCode}
            className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <span>Invite code:</span>
            <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs group-hover:bg-muted/80 transition-colors">{inviteCode}</span>
            {copied
              ? <Check className="w-3.5 h-3.5 text-emerald-500" />
              : <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            }
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Add Expense */}
          <Dialog open={isAddExpenseOpen} onOpenChange={(open) => {
            setIsAddExpenseOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger render={
              <Button className="gap-2 shadow-sm hover:shadow transition-shadow">
                <Plus className="w-4 h-4" /> Add Expense
              </Button>
            } />
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Add an Expense</DialogTitle>
                <DialogDescription>
                  Enter the amount in {useNepali ? 'Nepali Rupees (NPR)' : 'US Dollars (USD)'}.
                </DialogDescription>
              </DialogHeader>
              <form
                action={async (formData) => {
                  startTransition(async () => {
                    // Capture the user-visible amount BEFORE currency conversion for notifications
                    const rawAmountStr = formData.get('amount') as string
                    const rawAmount = parseFloat(rawAmountStr)
                    if (useNepali) {
                      if (!isNaN(rawAmount)) {
                        formData.set('displayAmount', `Rs. ${rawAmount.toLocaleString()}`)
                        formData.set('amount', (rawAmount / NPR_RATE).toString())
                      }
                    } else {
                      if (!isNaN(rawAmount)) {
                        formData.set('displayAmount', `$${rawAmount.toFixed(2)}`)
                      }
                    }
                    // Pass custom split members
                    if (splitType === 'shared') {
                      formData.set('splitWith', splitWith.join(','))
                    }

                    if (!navigator.onLine) {
                      const offlineItem: OfflineExpense = {
                        id: Date.now().toString(),
                        roomId: roomId,
                        description: formData.get('description') as string,
                        amount: formData.get('amount') as string,
                        displayAmount: formData.get('displayAmount') as string,
                        payerId: formData.get('payerId') as string,
                        splitWith: splitType === 'shared' ? splitWith.join(',') : undefined,
                        date: new Date().toISOString()
                      }
                      setOfflineQueue(prev => [offlineItem, ...prev])
                      setIsAddExpenseOpen(false)
                      resetForm()
                      return
                    }

                    const res = await addExpense(formData)
                    if (!res?.error) {
                      setIsAddExpenseOpen(false)
                      resetForm()
                    }
                  })
                }}
                className="grid gap-4 pt-2"
              >
                <input type="hidden" name="roomId" value={roomId} />
                <div className="grid gap-1.5">
                  <Label htmlFor="description">What was it for?</Label>
                  <Input id="description" name="description" placeholder="e.g. Groceries, Netflix, Pizza…" required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="amount">
                    How much? <span className="text-muted-foreground font-normal">({useNepali ? 'in NPR' : 'in USD'})</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                      {useNepali ? 'Rs.' : '$'}
                    </span>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step={useNepali ? '1' : '0.01'}
                      min="1"
                      placeholder={useNepali ? '0' : '0.00'}
                      required
                      className={useNepali ? 'pl-9' : 'pl-7'}
                      onChange={e => setExpenseAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="payerId">Paid By</Label>
                  <Select name="payerId" value={selectedPayer} onValueChange={(v) => { if (v) setSelectedPayer(v) }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select who paid">
                        {selectedPayer === currentUserId ? 'You' : memberNames[selectedPayer]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={currentUserId}>You</SelectItem>
                      {Object.entries(memberNames)
                        .filter(([id]) => id !== currentUserId)
                        .map(([id, name]) => (
                          <SelectItem key={id} value={id}>{name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="type">Split type</Label>
                  <Select
                    name="type"
                    value={splitType}
                    onValueChange={(v) => {
                      if (!v) return
                      const t = v as 'shared' | 'personal'
                      setSplitType(t)
                      if (t === 'shared') setSplitWith(allMemberIds)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shared">Split with members</SelectItem>
                      <SelectItem value="personal">Just me — no split</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Member toggle chips — only for shared */}
                {splitType === 'shared' && (
                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">Split with</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(memberNames).map(([id, name]) => {
                        const isSelected = splitWith.includes(id)
                        const displayName = id === currentUserId ? 'You' : name
                        const initial = displayName[0]?.toUpperCase() || '?'
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleMember(id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-muted text-muted-foreground border-border hover:border-indigo-400 hover:text-foreground'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isSelected ? 'bg-white/20' : 'bg-slate-300 dark:bg-slate-600'
                            }`}>{initial}</span>
                            {displayName}
                          </button>
                        )
                      })}
                    </div>
                    {/* Live split preview */}
                    {splitWith.length > 0 && expenseAmount > 0 && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                        {useNepali
                          ? `Rs. ${expenseAmount} ÷ ${splitWith.length} ${splitWith.length === 1 ? 'person' : 'people'} = Rs. ${(expenseAmount / splitWith.length).toFixed(0)} each`
                          : `$${expenseAmount} ÷ ${splitWith.length} ${splitWith.length === 1 ? 'person' : 'people'} = $${(expenseAmount / splitWith.length).toFixed(2)} each`
                        }
                      </p>
                    )}
                  </div>
                )}

                <Button type="submit" disabled={isPending} className="mt-1 transition-opacity">
                  {isPending ? 'Saving…' : 'Save Expense'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingExpenses && pendingExpenses.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
          <h3 className="font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
            <UserCircle className="w-5 h-5" /> Pending Approvals
          </h3>
          <div className="space-y-2">
            {pendingExpenses.map((exp: any) => (
              <div key={exp.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                <div>
                  <p className="text-sm font-medium">
                    <span className="font-semibold">{exp.users?.name || 'Someone'}</span> added an expense in your name.
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    "{exp.description}" for {formatAmount(exp.amount, useNepali)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={rejectExpense}>
                    <input type="hidden" name="expenseId" value={exp.id} />
                    <Button type="submit" variant="outline" size="sm" className="h-8 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30">Reject</Button>
                  </form>
                  <form action={approveExpense}>
                    <input type="hidden" name="expenseId" value={exp.id} />
                    <Button type="submit" size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white">Approve</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <StatCard label="Others owe you" amount={totalOwedToMe} type="positive" delay={0} useNepali={useNepali} />
        <StatCard label="You owe others" amount={totalIOwe} type="negative" delay={75} useNepali={useNepali} />
        <StatCard
          label={netLabel}
          amount={Math.abs(netBalance)}
          type={netBalance > 0 ? 'positive' : netBalance < 0 ? 'negative' : 'neutral'}
          delay={150}
          useNepali={useNepali}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="balances" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="balances" className="flex-1 sm:flex-none">Who Owes Who</TabsTrigger>
          <TabsTrigger value="recent" className="flex-1 sm:flex-none">Recent Expenses</TabsTrigger>
        </TabsList>

        {/* Balances tab */}
        <TabsContent value="balances" className="mt-4 space-y-3">
          {balances.some(b => b.from === currentUserId) && (
            <div className="flex justify-end mb-2">
              <Dialog>
                <DialogTrigger render={
                  <Button variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                    Settle All Balances
                  </Button>
                } />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Settle All Balances</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to mark all your outstanding debts in this room as paid?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose render={<Button variant="ghost">Cancel</Button>} />
                    <form 
                      action={(formData) => {
                        startTransition(async () => {
                          await settleAllBalances(formData)
                        })
                      }}
                    >
                      <input type="hidden" name="roomId" value={roomId} />
                      <input type="hidden" name="debts" value={JSON.stringify(balances.filter(b => b.from === currentUserId))} />
                      <Button type="submit" disabled={isPending}>Confirm Payment</Button>
                    </form>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {balances.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-medium">Everyone is settled up!</p>
              <p className="text-sm mt-1">No outstanding balances right now.</p>
            </div>
          ) : (
            balances.map((b, idx) => {
              const fromName = b.from === currentUserId ? 'You' : (memberNames[b.from] || 'Someone')
              const toName = b.to === currentUserId ? 'you' : (memberNames[b.to] || 'someone')
              const isUserOwing = b.from === currentUserId
              const isUserOwed = b.to === currentUserId

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 hover:shadow-sm ${
                    isUserOwing
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40'
                      : isUserOwed
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40'
                      : 'bg-muted/40 border-border'
                  }`}
                >
                  <Avatar name={b.from === currentUserId ? currentUserName : (memberNames[b.from] || '?')} size="sm" />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight">
                      <span className={isUserOwing ? 'text-rose-700 dark:text-rose-400' : isUserOwed ? 'text-emerald-700 dark:text-emerald-400' : ''}>
                        {fromName}
                      </span>
                      {' owes '}
                      <span className={isUserOwed ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : ''}>
                        {toName}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isUserOwing ? "Mark as paid once you've sent the money" : isUserOwed ? 'Waiting for their payment' : 'Between roommates'}
                    </p>
                  </div>

                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

                  <Avatar name={b.to === currentUserId ? currentUserName : (memberNames[b.to] || '?')} size="sm" />

                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-1">
                    <span className={`text-base font-bold tabular-nums ${isUserOwing ? 'text-rose-700 dark:text-rose-400' : isUserOwed ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
                      {formatAmount(b.amount, useNepali)}
                    </span>
                    {isUserOwing && (
                      <SettleButton
                        roomId={roomId}
                        payeeId={b.to}
                        payeeName={toName}
                        amount={b.amount}
                      />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </TabsContent>

        {/* Recent Expenses tab */}
        <TabsContent value="recent" className="mt-4 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Recent Expenses</h3>
            <Button onClick={() => setIsAddExpenseOpen(true)} size="sm" className="gap-1.5 h-8 text-xs shadow-sm hover:shadow transition-shadow">
              <Plus className="w-3.5 h-3.5" /> Add Expense
            </Button>
          </div>

          {/* Render Offline Queue */}
          {offlineQueue.map((exp, idx) => {
            const payerName = exp.payerId === currentUserId ? 'You' : (memberNames[exp.payerId] || 'Someone')
            const isYou = exp.payerId === currentUserId
            return (
              <div
                key={exp.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 opacity-80"
              >
                <Avatar name={payerName} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate flex items-center gap-2">
                    {exp.description}
                    <span className="text-[10px] bg-amber-200 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                      Queued
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {'Paid by '}
                    <span className={isYou ? 'font-medium text-foreground' : ''}>{payerName}</span>
                    {' · '}
                    {formatDate(exp.date, useNepali)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-base tabular-nums">{formatAmount(Number(exp.amount), useNepali)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    exp.splitWith
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {exp.splitWith ? 'Split' : 'Personal'}
                  </span>
                </div>
              </div>
            )
          })}

          {recentExpenses.length === 0 && offlineQueue.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <div className="text-4xl mb-3">🧾</div>
              <p className="font-medium mb-1">No expenses yet</p>
              <p className="text-sm mb-4">Add your first expense to get started.</p>
              <Button onClick={() => setIsAddExpenseOpen(true)} className="gap-2 shadow-sm hover:shadow transition-shadow">
                <Plus className="w-4 h-4" /> Add Expense
              </Button>
            </div>
          ) : (
            recentExpenses.map((exp, idx) => {
              const payerName = exp.payer_id === currentUserId ? 'You' : (exp.users?.name || 'Someone')
              const isYou = exp.payer_id === currentUserId
              return (
                <div
                  key={exp.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all duration-200 hover:shadow-sm"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <Avatar name={exp.users?.name || '?'} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{exp.description}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {'Paid by '}
                      <span className={isYou ? 'font-medium text-foreground' : ''}>{payerName}</span>
                      {' · '}
                      {formatDate(exp.created_at, useNepali)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-base tabular-nums">{formatAmount(Number(exp.amount), useNepali)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      exp.type === 'shared'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {exp.type === 'shared' ? 'Split' : 'Personal'}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
