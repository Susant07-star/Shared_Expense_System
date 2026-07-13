'use client'

import { updateRoomApprovalSetting } from '@/app/dashboard/actions'

export function SecurityToggle({ roomId, initialValue }: { roomId: string, initialValue: boolean }) {
  return (
    <form action={updateRoomApprovalSetting} className="flex items-center gap-4">
      <input type="hidden" name="roomId" value={roomId} />
      <label className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          name="requireApproval" 
          className="sr-only peer" 
          defaultChecked={initialValue}
          onChange={(e) => e.target.form?.requestSubmit()} 
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
      </label>
    </form>
  )
}
