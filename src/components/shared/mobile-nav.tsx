'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Menu, X, Home, Receipt, Users, Settings, Activity, LogOut, ChevronDown, Crown } from 'lucide-react'
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

export function MobileNav({ allRooms }: { allRooms: Room[] }) {
  const [open, setOpen] = useState(false)
  const [roomMenuOpen, setRoomMenuOpen] = useState(false)
  const [isSigningOut, startSignOut] = useTransition()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const roomFromUrl = searchParams.get('room')

  const currentRoomId =
    roomFromUrl && allRooms.some(room => room.id === roomFromUrl)
      ? roomFromUrl
      : allRooms[0]?.id ?? ''

  const currentRoom = allRooms.find(room => room.id === currentRoomId)
  const roomQuery = currentRoomId ? `?room=${currentRoomId}` : ''

  const close = () => {
    setOpen(false)
    setRoomMenuOpen(false)
  }

  const drawer = (
    <div className="fixed inset-0 z-[1000] md:hidden">
      <button
        type="button"
        aria-label="Close menu"
        className="app-mobile-backdrop absolute inset-0 h-full w-full bg-black/50 backdrop-blur-sm"
        onClick={close}
      />

      <aside
        id="mobile-dashboard-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard navigation"
        className="app-mobile-drawer relative z-[1001] flex h-screen w-[min(20rem,86vw)] flex-col bg-white text-slate-950 shadow-2xl dark:bg-gray-950 dark:text-slate-50"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-300">
            Roommates
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <nav className="border-b border-slate-200 p-3 dark:border-slate-800">
            <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Navigation
            </p>
            <div className="space-y-1">
              {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href

                return (
                  <Link
                    key={href}
                    href={`${href}${roomQuery}`}
                    onClick={close}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-200'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          {allRooms.length > 0 && (
            <section className="border-b border-slate-200 p-4 dark:border-slate-800">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Current Room
              </p>
              <button
                type="button"
                onClick={() => setRoomMenuOpen(value => !value)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-left text-indigo-800 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200 dark:hover:bg-indigo-900/50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-xs font-bold text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200">
                    {(currentRoom?.name || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate text-sm font-semibold">
                    {currentRoom?.name || 'Select Room'}
                  </span>
                  {currentRoom?.role === 'admin' && (
                    <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  )}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${roomMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {roomMenuOpen && (
                <div className="app-popover-in mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-gray-900">
                  {allRooms.map(room => (
                    <Link
                      key={room.id}
                      href={`/dashboard?room=${room.id}`}
                      onClick={close}
                      className={`flex min-h-10 items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                        room.id === currentRoomId
                          ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                        {(room.name || '?').charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate">{room.name || 'Unknown Room'}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 p-3 pb-8 dark:border-slate-800">
          <Dialog>
            <DialogTrigger render={
              <button
                type="button"
                disabled={isSigningOut}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-red-950/30 dark:hover:text-red-400"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
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
                <Button
                  variant="destructive"
                  onClick={() => {
                    close()
                    startSignOut(() => signout())
                  }}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? 'Signing out...' : 'Confirm Sign Out'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </aside>
    </div>
  )

  return (
    <div className="flex shrink-0 items-center md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-controls="mobile-dashboard-menu"
        aria-expanded={open}
        className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && typeof document !== 'undefined' && createPortal(drawer, document.body)}
    </div>
  )
}