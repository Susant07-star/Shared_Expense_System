import { createClient } from '@/lib/supabase/server'

export type Debt = {
  from: string
  to: string
  amount: number
}

export async function calculateBalances(roomId: string) {
  const supabase = await createClient()

  // 1. Get all expenses and their splits
  const { data: expenses } = await supabase
    .from('expenses')
    .select(`
      id,
      payer_id,
      expense_splits (
        user_id,
        amount_owed
      )
    `)
    .eq('room_id', roomId)
    .eq('status', 'paid')
    .eq('approval_status', 'approved')

  // 2. Get all settlements
  const { data: settlements } = await supabase
    .from('settlements')
    .select('*')
    .eq('room_id', roomId)

  // Map: debtor -> creditor -> amount
  const graph: Record<string, Record<string, number>> = {}

  const addDebt = (from: string, to: string, amount: number) => {
    if (from === to || amount <= 0) return
    if (!graph[from]) graph[from] = {}
    if (!graph[from][to]) graph[from][to] = 0
    graph[from][to] += amount
  }

  // Add debts from expenses
  expenses?.forEach((exp: any) => {
    const creditor = exp.payer_id
    if (!creditor) return

    exp.expense_splits?.forEach((split: any) => {
      const debtor = split.user_id
      if (debtor !== creditor) {
        addDebt(debtor, creditor, split.amount_owed)
      }
    })
  })

  // Subtract settlements
  settlements?.forEach((stl: any) => {
    // Settle means from -> to debt decreases
    const debtor = stl.payer_id
    const creditor = stl.payee_id
    
    // We can simulate this by adding negative debt or just simplifying
    // A simpler way: treat settlement as a reverse debt
    addDebt(creditor, debtor, stl.amount)
  })

  // Simplify debts (net balances)
  // For each pair A, B, net debt = graph[A][B] - graph[B][A]
  const simplified: Debt[] = []
  
  const processed = new Set<string>()

  for (const from in graph) {
    for (const to in graph[from]) {
      const pairKey = [from, to].sort().join('-')
      if (processed.has(pairKey)) continue
      processed.add(pairKey)

      const fromToTo = graph[from][to] || 0
      const toToFrom = graph[to]?.[from] || 0
      
      const net = fromToTo - toToFrom
      if (net > 0) {
        simplified.push({ from, to, amount: parseFloat(net.toFixed(2)) })
      } else if (net < 0) {
        simplified.push({ from: to, to: from, amount: parseFloat(Math.abs(net).toFixed(2)) })
      }
    }
  }

  return simplified
}
