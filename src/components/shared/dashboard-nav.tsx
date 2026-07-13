'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Home, Receipt, Users, Settings, Activity } from 'lucide-react'
import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { createRoom } from '@/app/dashboard/actions'

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
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

export function DashboardNav({
  allRooms,
  selectedRoomId,
}: {
  allRooms: Room[]
  selectedRoomId: string
}) {
  const pathname = usePathname()
  const [roomMenuOpen, setRoomMenuOpen] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const selectedRoom = allRooms.find(r => r.id === selectedRoomId)

  // Build href with room query param (append to each nav link)
  const roomQuery = `?room=${selectedRoomId}`

  return (
    <>
      {/* Room Switcher */}
      <div className="p-4 border-b relative">
        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-widest mb-1.5 px-1">Current Room</p>
        <button
          onClick={() => setRoomMenuOpen(v => !v)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
        >
          <span className="font-semibold text-sm truncate">{selectedRoom?.name ?? 'Select Room'}</span>
          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${roomMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {roomMenuOpen && (
          <div className="absolute left-4 right-4 mt-1 z-50 bg-white dark:bg-gray-900 border rounded-xl shadow-xl overflow-hidden">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-widest px-3 pt-3 pb-1">Switch Room</p>
            {allRooms.map(room => (
              <Link
                key={room.id}
                href={`/dashboard?room=${room.id}`}
                onClick={() => setRoomMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors ${
                  room.id === selectedRoomId ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-foreground'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-200 shrink-0">
                  {room.name[0]?.toUpperCase()}
                </span>
                <span className="truncate">{room.name}</span>
              </Link>
            ))}
            <div className="border-t p-2">
              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-muted rounded-lg transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" /> Create New Room
                </button>
              ) : (
                <form
                  action={async (fd) => {
                    await createRoom(fd)
                    setShowCreateForm(false)
                    setRoomMenuOpen(false)
                  }}
                  className="flex gap-2 px-1"
                >
                  <input
                    name="roomName"
                    autoFocus
                    placeholder="Room name…"
                    required
                    className="flex-1 text-sm px-2 py-1.5 border rounded-md bg-background outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button type="submit" className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors font-semibold">
                    Go
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1">
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
    </>
  )
}
