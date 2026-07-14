'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { updateExpensePreferences } from '@/app/dashboard/actions'

export function ExpenseSettingsForm({
  initialAllowOthers,
  initialRequireApproval,
}: {
  initialAllowOthers: boolean
  initialRequireApproval: boolean
}) {
  const [allowOthers, setAllowOthers] = useState(initialAllowOthers)

  return (
    <form action={updateExpensePreferences} className="space-y-6">
      {/* Toggle 1: Allow others to add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 flex-1">
          <Label htmlFor="allowOthers" className="text-base">Allow others to add expenses for me</Label>
          <p className="text-xs text-muted-foreground">Other members can select you as the "Paid By" person when adding an expense.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            name="allowOthers"
            className="sr-only peer"
            checked={allowOthers}
            onChange={(e) => {
              setAllowOthers(e.target.checked)
              e.target.form?.requestSubmit()
            }}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {/* Toggle 2: Require Approval */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-opacity duration-200 ${allowOthers ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        <div className="space-y-1 flex-1">
          <Label htmlFor="requireApproval" className="text-base">Require my approval</Label>
          <p className="text-xs text-muted-foreground">When others add an expense in your name, you must approve it before it affects balances.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            name="requireApproval"
            className="sr-only peer"
            defaultChecked={initialRequireApproval}
            onChange={(e) => e.target.form?.requestSubmit()}
            disabled={!allowOthers}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
        </label>
      </div>
    </form>
  )
}
