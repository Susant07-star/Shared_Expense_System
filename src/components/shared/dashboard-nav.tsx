'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Home, Receipt, Users, Settings, Activity, LogOut, ChevronDown, Plus } from 'lucide-react'
import { useState, useTransition } from 'react'
import { createRoom } from '@/app/dashboard/actions'
import { signout } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

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

export function DashboardNav({ allRooms }: { allRooms: Room[] }) {
  const pathname = usePathname()
  // Read the room directly from the URL — this always stays in sync
  const searchParams = useSearchParams()
  const roomFromUrl = searchParams.get('room')

  // Determine the active room from URL or fall back to first
  const currentRoomId =
    roomFromUrl && allRooms.some(r => r.id === roomFromUrl)
      ? roomFromUrl
      : allRooms[0]?.id ?? ''

  const currentRoom = allRooms.find(r => r.id === currentRoomId)

  const [roomMenuOpen, setRoomMenuOpen] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isSigningOut, startSignOut] = useTransition()

  const roomQuery = currentRoomId ? `?room=${currentRoomId}` : ''

  return (
    <>
      {/* Room Switcher */}
      <div className="p-4 border-b relative">
        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-widest mb-1.5 px-1">
          Current Room
        </p>
        <button
          onClick={() => setRoomMenuOpen(v => !v)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
        >
          <span className="font-semibold text-sm truncate">
            {currentRoom?.name || 'Select Room'}
          </span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 transition-transform duration-200 ${roomMenuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {roomMenuOpen && (
          <div className="absolute left-4 right-4 mt-1 z-50 bg-white dark:bg-gray-900 border rounded-xl shadow-xl overflow-hidden">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-widest px-3 pt-3 pb-1">
              Switch Room
            </p>
            {allRooms.map(room => (
              <Link
                key={room.id}
                href={`/dashboard?room=${room.id}`}
                onClick={() => setRoomMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors ${
                  room.id === currentRoomId
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-foreground'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-200 shrink-0">
                  {(room.name || '?').charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{room.name || 'Unknown Room'}</span>
              </Link>
            ))}

          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={`${href}${roomQuery}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign Out - always visible at the bottom */}
      <div className="p-4 pb-8 border-t shrink-0">
        <Dialog>
          <DialogTrigger render={
            <button
              type="button"
              disabled={isSigningOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150 disabled:opacity-50"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign out?</DialogTitle>
              <DialogDescription>
                Are you sure you want to sign out of Roommates?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button variant="destructive" onClick={() => startSignOut(() => signout())} disabled={isSigningOut}>
                {isSigningOut ? 'Signing out...' : 'Confirm Sign Out'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
