'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { markNotificationAsRead } from '@/app/dashboard/actions'

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
  
  // We use local state to instantly remove the red dot when clicked
  const [notifications, setNotifications] = useState(initialNotifications)

  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    // Update local state if props change (e.g. from server action revalidation)
    setNotifications(initialNotifications)
  }, [initialNotifications])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      // Server action
      await markNotificationAsRead(notif.id)
    }
    setOpen(false)
    
    // Optional: client-side redirect based on type
    if (notif.type === 'join_request') {
      window.location.href = '/dashboard/members'
    } else if (notif.type === 'expense_added') {
      window.location.href = '/dashboard/activity'
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-gray-950"></span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-96">
          <div className="p-3 border-b flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                {unreadCount} new
              </span>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map(notif => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 text-left border-b last:border-b-0 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      !notif.is_read ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {!notif.is_read && (
                        <div className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-indigo-500"></div>
                      )}
                      <div className={!notif.is_read ? '' : 'pl-5'}>
                        <p className={`text-sm ${!notif.is_read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
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
      )}
    </div>
  )
}
