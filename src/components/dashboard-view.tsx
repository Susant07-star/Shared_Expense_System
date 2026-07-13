'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus, TrendingUp, TrendingDown, Minus, ArrowRight,
  Copy, Check, ChevronDown, DollarSign, BadgeCent,
} from 'lucide-react'
import { addExpense, settleUp, setNepaliMode } from '@/app/dashboard/actions'
import { formatDate, formatAmount } from '@/lib/nepali'

type Room = { id: string; name: string; invite_code: string; role: string }

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

// ─── Currency Dropdown ────────────────────────────────────────────────────────
function CurrencyDropdown({
  useNepali,
  onChange,
  disabled,
}: {
  useNepali: boolean
  onChange: (val: boolean) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const options = [
    {
      value: true,
      label: 'NPR / BS',
      sub: 'Nepali Rupees · Bikram Sambat',
      icon: <BadgeCent className="w-4 h-4 text-indigo-500" />,
    },
    {
      value: false,
      label: 'USD / AD',
      sub: 'US Dollar · Gregorian',
      icon: <DollarSign className="w-4 h-4 text-emerald-500" />,
    },
  ]

  const active = options.find(o => o.value === useNepali)!

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={disabled}
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200
          ${useNepali
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
            : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
          } ${disabled ? 'opacity-60 cursor-wait' : 'hover:brightness-110'}`}
      >
        {active.icon}
        {active.label}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 border rounded-xl shadow-xl z-50 overflow-hidden">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground px-3 pt-3 pb-1">
            Display Currency & Date
          </p>
          {options.map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left ${
                opt.value === useNepali ? 'bg-muted/60' : ''
              }`}
            >
              <span className="shrink-0">{opt.icon}</span>
              <span>
                <span className="block text-sm font-semibold">{opt.label}</span>
                <span className="block text-xs text-muted-foreground">{opt.sub}</span>
              </span>
              {opt.value === useNepali && (
                <Check className="w-3.5 h-3.5 ml-auto text-indigo-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function DashboardView({
  roomName, inviteCode, roomId, allRooms, recentExpenses, balances,
  currentUserId, currentUserName, memberNames, totalOwedToMe, totalIOwe, initialUseNepali,
}: {
  roomName: string
  inviteCode: string
  roomId: string
  allRooms: Room[]
  recentExpenses: any[]
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
          {/* Currency / Date dropdown */}
          <CurrencyDropdown
            useNepali={useNepali}
            onChange={handleCurrencyChange}
            disabled={isCurrencyPending}
          />

          {/* Add Expense */}
          <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
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
                    if (useNepali) {
                      const amountStr = formData.get('amount') as string
                      const amountNpr = parseFloat(amountStr)
                      if (!isNaN(amountNpr)) {
                        // Convert NPR → USD for storage
                        formData.set('amount', (amountNpr / NPR_RATE).toString())
                      }
                    }
                    const res = await addExpense(formData)
                    if (!res?.error) setIsAddExpenseOpen(false)
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
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="type">Split type</Label>
                  <Select name="type" defaultValue="shared">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shared">Split equally with everyone</SelectItem>
                      <SelectItem value="personal">Just me — no split</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isPending} className="mt-2 transition-opacity">
                  {isPending ? 'Saving…' : 'Save Expense'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                      <form action={settleUp}>
                        <input type="hidden" name="roomId" value={roomId} />
                        <input type="hidden" name="payeeId" value={b.to} />
                        <input type="hidden" name="amount" value={b.amount} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2.5 border-rose-200 hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 transition-all"
                        >
                          Mark Paid
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </TabsContent>

        {/* Recent Expenses tab */}
        <TabsContent value="recent" className="mt-4 space-y-2">
          {recentExpenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-3">🧾</div>
              <p className="font-medium">No expenses yet</p>
              <p className="text-sm mt-1">Add your first expense using the button above.</p>
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
