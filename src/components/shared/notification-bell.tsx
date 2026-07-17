'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/app/dashboard/actions'

export type Notification = {
  id: string
  message: string
  is_read: boolean
  created_at: string
  type: string
}

export function NotificationBell({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState(initialNotifications)

  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    setNotifications(initialNotifications)
  }, [initialNotifications])

  useEffect(() => {
    const handler = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      await markNotificationAsRead(notif.id)
    }

    setOpen(false)

    if (notif.type === 'join_request') {
      window.location.href = '/dashboard/members'
    } else if (notif.type === 'expense_added') {
      window.location.href = '/dashboard/activity'
    }
  }

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    await markAllNotificationsAsRead()
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-label="Open notifications"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500 dark:border-gray-950" />
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[4.25rem] z-[1200] flex max-h-[min(28rem,calc(100dvh-5.25rem))] overflow-hidden rounded-xl border bg-white shadow-2xl dark:bg-gray-900 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[320px] sm:max-w-[calc(100vw-2rem)] sm:max-h-96">
          <div className="flex min-h-0 w-full flex-col">
            <div className="flex shrink-0 items-center justify-between border-b bg-slate-50/80 p-3 dark:bg-slate-900/80">
              <h3 className="text-sm font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="flex min-h-8 min-w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    title="Mark all as read"
                    aria-label="Mark all notifications as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                {unreadCount > 0 && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                    {unreadCount} new
                  </span>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map(notif => (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full border-b p-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        !notif.is_read ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''
                      }`}
                    >
                      <div className="flex min-w-0 gap-3">
                        {!notif.is_read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                        )}
                        <div className={`min-w-0 ${!notif.is_read ? '' : 'pl-5'}`}>
                          <p className={`break-words text-sm leading-snug ${!notif.is_read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                            {notif.message}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}