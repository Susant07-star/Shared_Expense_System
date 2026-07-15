'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Home, Receipt, Users, Settings, Activity, LogOut, ChevronDown, Crown } from 'lucide-react'
import { signout } from '@/app/(auth)/actions'
import { useTransition } from 'react'

type Room = {
  id: string
  name: string
  invite_code: string
  role: string
}

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/activity', icon: Activity, label: 'Activity' },
  { href: '/dashboard/expenses', icon: Receipt, label: 'Expenses' },
  { href: '/dashboard/members', icon: Users, label: 'Members' },
  { href: '/dashboard/settings', icon: Settings, label: 'Room Settings' },
]

export function MobileNav({ allRooms }: { allRooms: Room[] }) {
  const [open, setOpen] = useState(false)
  const [roomMenuOpen, setRoomMenuOpen] = useState(false)
  const [isSigningOut, startSignOut] = useTransition()
  const pathname = usePathname()

  // Use first room as default (no useSearchParams needed here)
  const currentRoom = allRooms[0]
  const roomQuery = currentRoom ? `?room=${currentRoom.id}` : ''

  const close = () => {
    setOpen(false)
    setRoomMenuOpen(false)
  }

  return (
    <div className="md:hidden flex items-center shrink-0">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* Slide-in drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-[280px] bg-white dark:bg-gray-950 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Roommates
          </span>
          <button
            onClick={close}
            aria-label="Close menu"
            className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Room switcher */}
          {allRooms.length > 0 && (
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest mb-2 px-1">
                Current Room
              </p>
              <button
                onClick={() => setRoomMenuOpen(v => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-200 shrink-0">
                    {(currentRoom?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm truncate">
                    {currentRoom?.name || 'Select Room'}
                  </span>
                  {currentRoom?.role === 'admin' && (
                    <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${roomMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {roomMenuOpen && allRooms.length > 1 && (
                <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-gray-900 shadow-lg">
                  {allRooms.map(room => (
                    <Link
                      key={room.id}
                      href={`/dashboard?room=${room.id}`}
                      onClick={close}
                      className={`flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                        room.id === currentRoom?.id
                          ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-300 shrink-0">
                        {(room.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{room.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Nav links */}
          <nav className="p-3 space-y-0.5">
            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest mb-2 px-2 pt-1">
              Navigation
            </p>
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={`${href}${roomQuery}`}
                  onClick={close}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Sign out at bottom */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 pb-8">
          <button
            onClick={() => {
              close()
              startSignOut(() => signout())
            }}
            disabled={isSigningOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150 disabled:opacity-50"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSigningOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  )
}
