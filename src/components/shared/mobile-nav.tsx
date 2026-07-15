'use client'

import { useState, Suspense } from 'react'
import { Menu, X } from 'lucide-react'
import { DashboardNav } from './dashboard-nav'

type Room = {
  id: string
  name: string
  invite_code: string
  role: string
}

export function MobileNav({ allRooms }: { allRooms: Room[] }) {
  const [open, setOpen] = useState(false)

  return (
    // Only shown on mobile (md: is the sidebar breakpoint)
    <div className="md:hidden flex items-center shrink-0">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* App name — hidden on very small screens to save space */}
      <span className="hidden xs:block sm:block ml-1 text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 select-none">
        Roommates
      </span>

      {/* Overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer — always in DOM so Suspense/useSearchParams works cleanly */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-gray-950 flex flex-col shadow-2xl transition-transform duration-250 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Roommates
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav content — close drawer when any nav link/button is clicked */}
        <div
          className="flex-1 overflow-y-auto"
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (target.closest('a') || target.closest('button[data-nav]')) {
              setTimeout(() => setOpen(false), 120)
            }
          }}
        >
          <Suspense fallback={
            <div className="p-4 space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          }>
            <DashboardNav allRooms={allRooms} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
