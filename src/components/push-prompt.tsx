'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, BellOff } from 'lucide-react'
import { subscribeToPush, unsubscribeFromPush } from '@/app/dashboard/push-actions'

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushPrompt() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setIsSubscribed(true)
        })
      })
    }
  }, [])

  const subscribe = async () => {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
        })
        await subscribeToPush(sub as any)
        setIsSubscribed(true)
      }
    } catch (err) {
      console.error('Failed to subscribe:', err)
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await unsubscribeFromPush(sub.endpoint)
        setIsSubscribed(false)
      }
    } catch (err) {
      console.error('Failed to unsubscribe:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) return null

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={loading}
      className={`gap-2 ${isSubscribed ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30' : ''}`}
    >
      {isSubscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
      <span className="hidden sm:inline">{isSubscribed ? 'Notifications On' : 'Enable Notifications'}</span>
    </Button>
  )
}
