'use client'

import { useState } from 'react'
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
    <div className="md:hidden flex items-center">
      <button
        onClick={() => setOpen(true)}
        className="p-2 -ml-2 mr-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* App Branding on Mobile */}
      <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
        Roommates
      </h2>

      {/* Mobile Menu Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setOpen(false)}
          />
          
          {/* Sidebar Panel */}
          <div className="relative w-64 max-w-[80vw] bg-white dark:bg-gray-950 h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="p-4 flex items-center justify-between border-b">
              <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Roommates
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div 
              className="flex-1 overflow-y-auto"
              onClick={(e) => {
                // Close menu if a link is clicked
                if ((e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('button.w-full')) {
                  // Give it a tiny delay so the ripple effect plays
                  setTimeout(() => setOpen(false), 150)
                }
              }}
            >
              <DashboardNav allRooms={allRooms} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
