'use server'

import { createClient } from '@/lib/supabase/server'

export async function subscribeToPush(sub: PushSubscription) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const subJson = sub.toJSON()

  await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: subJson.keys?.p256dh,
    auth: subJson.keys?.auth,
  }, {
    onConflict: 'user_id, endpoint'
  })

  return { success: true }
}

export async function unsubscribeFromPush(endpoint: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  return { success: true }
}
