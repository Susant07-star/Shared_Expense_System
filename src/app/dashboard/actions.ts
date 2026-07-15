'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

import webpush from 'web-push'

function getWebPush() {
  webpush.setVapidDetails(
    'mailto:support@sharedexpenses.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  )
  return webpush
}

// Helper for notifications
async function createNotification(supabase: any, { userIds, actorId, roomId, type, message }: { userIds: string[], actorId?: string, roomId?: string, type: string, message: string }) {
  if (!userIds || userIds.length === 0) return
  const notifications = userIds.map(uid => ({
    user_id: uid,
    actor_id: actorId,
    room_id: roomId,
    type,
    message
  }))
  await supabase.from('notifications').insert(notifications)

  // Send Web Push Notifications
  try {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (subs && subs.length > 0) {
      const wp = getWebPush()
      const payload = JSON.stringify({
        title: 'Shared Expenses',
        body: message,
        data: { url: roomId ? `/dashboard?room=${roomId}` : '/dashboard' }
      })

      const pushPromises = subs.map((sub: any) => 
        wp.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload).catch(async (err: any) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        })
      )
      await Promise.allSettled(pushPromises)
    }
  } catch (error) {
    console.error('Error sending push notifications:', error)
  }
}

export async function createRoom(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.error('Unauthorized')
    return
  }

  const roomName = formData.get('roomName') as string
  const roomId = crypto.randomUUID()

  // Insert room
  const { error: roomError } = await supabase
    .from('rooms')
    .insert([{ id: roomId, name: roomName }])

  if (roomError) {
    console.error('Room Error:', roomError)
    throw new Error(`Room Insert Error: ${roomError.message}`)
  }

  // Insert member
  const { error: memberError } = await supabase
    .from('room_members')
    .insert([{ room_id: roomId, user_id: user.id, role: 'admin' }])

  if (memberError) {
    console.error('Member Error:', memberError)
    throw new Error(`Member Insert Error: ${memberError.message}`)
  }

  revalidatePath('/dashboard', 'layout')
  redirect(`/dashboard?room=${roomId}`)
}

export async function joinRoom(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.error('Unauthorized')
    return
  }

  const inviteCode = formData.get('inviteCode') as string

  // Find room securely via RPC (bypasses RLS for this specific query)
  const { data: roomIds, error: roomError } = await supabase
    .rpc('get_room_by_invite_code', { code: inviteCode })

  if (roomError || !roomIds || roomIds.length === 0) {
    console.error('Invalid invite code')
    return
  }

  const room = roomIds[0]
  const status = room.require_approval ? 'pending' : 'active'

  // Insert member
  const { error: memberError } = await supabase
    .from('room_members')
    .insert([{ room_id: room.id, user_id: user.id, role: 'member', status }])

  if (memberError) {
    console.error(memberError.message)
    return
  }

  // Get user profile for notification
  const { data: userProfile } = await supabase.from('users').select('name').eq('id', user.id).single()
  const actorName = userProfile?.name || 'Someone'

  if (status === 'pending') {
    // Use SECURITY DEFINER RPC to bypass RLS — pending members can't query room_members directly
    const { data: admins } = await supabase.rpc('get_room_admins', { p_room_id: room.id })
    if (admins && admins.length > 0) {
      await createNotification(supabase, {
        userIds: admins.map((a: any) => a.user_id),
        actorId: user.id,
        roomId: room.id,
        type: 'join_request',
        message: `${actorName} requested to join ${room.name}`
      })
    }
  } else {
    // Use SECURITY DEFINER RPC to bypass RLS for member notifications
    const { data: members } = await supabase.rpc('get_room_active_members', { p_room_id: room.id, p_exclude_user_id: user.id })
    if (members && members.length > 0) {
      await createNotification(supabase, {
        userIds: members.map((m: any) => m.user_id),
        actorId: user.id,
        roomId: room.id,
        type: 'member_joined',
        message: `${actorName} joined ${room.name}`
      })
    }
    await createNotification(supabase, {
      userIds: [user.id],
      roomId: room.id,
      type: 'joined_room',
      message: `You successfully joined ${room.name}`
    })
  }

  revalidatePath('/dashboard', 'layout')
  
  if (status === 'active') {
    redirect(`/dashboard?room=${room.id}`)
  }
}

export async function addExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const roomId = formData.get('roomId') as string
  const description = formData.get('description') as string
  const amount = parseFloat(formData.get('amount') as string)
  const type = formData.get('type') as 'shared' | 'personal'
  let payerId = formData.get('payerId') as string
  
  if (!payerId) {
    payerId = user.id
  }

  if (!roomId || !description || isNaN(amount)) {
    return { error: 'Invalid input' }
  }

  let approvalStatus = 'approved'

  // Check permissions if adding on behalf of someone else
  if (payerId !== user.id) {
    const { data: payerPrefs } = await supabase
      .from('users')
      .select('allow_others_to_add, require_expense_approval, name')
      .eq('id', payerId)
      .single()

    if (payerPrefs) {
      if (payerPrefs.allow_others_to_add === false) {
        return { error: `${payerPrefs.name || 'This user'} does not allow others to add expenses on their behalf.` }
      }
      if (payerPrefs.require_expense_approval !== false) {
        // Defaults to true, so if it's true or null, require approval
        approvalStatus = 'pending'
      }
    }
  }

  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert([{
      room_id: roomId,
      created_by: user.id,
      payer_id: payerId,
      amount,
      description,
      type,
      status: 'paid',
      approval_status: approvalStatus
    }])
    .select()
    .single()

  if (expenseError || !expense) {
    return { error: expenseError?.message || 'Failed to add expense' }
  }

  if (type === 'shared') {
    // Use custom splitWith if provided, otherwise fall back to all active members
    const splitWithStr = formData.get('splitWith') as string | null
    let splitUserIds: string[] = []

    if (splitWithStr && splitWithStr.trim() !== '') {
      splitUserIds = splitWithStr.split(',').map(id => id.trim()).filter(Boolean)
    } else {
      const { data: members } = await supabase
        .from('room_members')
        .select('user_id')
        .eq('room_id', roomId)
        .eq('status', 'active')
      splitUserIds = (members || []).map(m => m.user_id)
    }

    if (splitUserIds.length > 0) {
      const splitAmount = amount / splitUserIds.length
      const splits = splitUserIds.map(uid => ({
        expense_id: expense.id,
        user_id: uid,
        amount_owed: splitAmount
      }))
      await supabase.from('expense_splits').insert(splits)
    }
  }

  const displayAmount = (formData.get('displayAmount') as string) || amount.toString()
  const { data: userProfile } = await supabase.from('users').select('name').eq('id', user.id).single()
  const actorName = userProfile?.name || 'Someone'
  const { data: roomInfo } = await supabase.from('rooms').select('name').eq('id', roomId).single()

  // Notify the payer if it's someone else
  if (payerId !== user.id) {
    await createNotification(supabase, {
      userIds: [payerId],
      actorId: user.id,
      roomId,
      type: 'expense_added',
      message: `${actorName} added an expense of ${displayAmount} in your name: "${description}".${approvalStatus === 'pending' ? ' It requires your approval.' : ''}`
    })
  }

  // Notify others (excluding the creator and the payer)
  if (type === 'shared') {
    const { data: members } = await supabase.from('room_members').select('user_id').eq('room_id', roomId).eq('status', 'active')
    if (members) {
      const otherMembers = members.filter(m => m.user_id !== user.id && m.user_id !== payerId)
      if (otherMembers.length > 0) {
        await createNotification(supabase, {
          userIds: otherMembers.map(m => m.user_id),
          actorId: user.id,
          roomId,
          type: 'expense_added',
          message: `${actorName} added a shared expense: ${description} in ${roomInfo?.name || 'a room'}`
        })
      }
    }
  }

  await supabase.from('activity_logs').insert([{
    room_id: roomId,
    user_id: user.id,
    action_type: 'expense_added',
    metadata: { description, amount, type, payer_id: payerId, approval_status: approvalStatus }
  }])

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function settleUp(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('Unauthorized')
    return
  }

  const roomId = formData.get('roomId') as string
  const payeeId = formData.get('payeeId') as string
  const amount = parseFloat(formData.get('amount') as string)

  if (!roomId || !payeeId || isNaN(amount) || amount <= 0) {
    console.error('Invalid input')
    return
  }

  const { error: settlementError } = await supabase
    .from('settlements')
    .insert([{
      room_id: roomId,
      payer_id: user.id,
      payee_id: payeeId,
      amount
    }])

  if (settlementError) {
    console.error(settlementError.message)
    return
  }

  // Notify the payee that they received payment
  const { data: payerProfile } = await supabase.from('users').select('name').eq('id', user.id).single()
  const { data: roomInfo } = await supabase.from('rooms').select('name').eq('id', roomId).single()
  const payerName = payerProfile?.name || 'Someone'
  const formattedAmount = `Rs. ${Math.round(amount * 135).toLocaleString()}`

  await createNotification(supabase, {
    userIds: [payeeId],
    actorId: user.id,
    roomId,
    type: 'payment_received',
    message: `${payerName} paid you ${formattedAmount} in ${roomInfo?.name || 'a room'}`
  })

  await supabase.from('activity_logs').insert([{
    room_id: roomId,
    user_id: user.id,
    action_type: 'settled_up',
    metadata: { amount, payeeId }
  }])

  revalidatePath('/dashboard', 'layout')
}

export async function settleAllBalances(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const roomId = formData.get('roomId') as string
  const debtsStr = formData.get('debts') as string
  if (!roomId || !debtsStr) return

  try {
    const debts = JSON.parse(debtsStr) as { from: string, to: string, amount: number }[]
    const validDebts = debts.filter(d => d.from === user.id && d.amount > 0)
    
    if (validDebts.length === 0) return

    const settlements = validDebts.map(d => ({
      room_id: roomId,
      payer_id: user.id,
      payee_id: d.to,
      amount: d.amount
    }))

    await supabase.from('settlements').insert(settlements)

    // Notify each payee individually
    const { data: payerProfile } = await supabase.from('users').select('name').eq('id', user.id).single()
    const { data: roomInfo } = await supabase.from('rooms').select('name').eq('id', roomId).single()
    const payerName = payerProfile?.name || 'Someone'

    for (const debt of validDebts) {
      const formattedAmount = `Rs. ${Math.round(debt.amount * 135).toLocaleString()}`
      await createNotification(supabase, {
        userIds: [debt.to],
        actorId: user.id,
        roomId,
        type: 'payment_received',
        message: `${payerName} paid you ${formattedAmount} in ${roomInfo?.name || 'a room'}`
      })
    }

    await supabase.from('activity_logs').insert([{
      room_id: roomId,
      user_id: user.id,
      action_type: 'settled_all',
      metadata: { count: validDebts.length, total: validDebts.reduce((acc, d) => acc + d.amount, 0) }
    }])
  } catch (e) {
    console.error('Failed to parse debts', e)
  }

  revalidatePath('/dashboard', 'layout')
}

export async function updateRoomName(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const roomId = formData.get('roomId') as string
  const roomName = formData.get('roomName') as string

  if (!roomId || !roomName) return

  // Verify they are an admin
  const { data: membership } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'admin') return

  await supabase
    .from('rooms')
    .update({ name: roomName })
    .eq('id', roomId)

  revalidatePath('/dashboard', 'layout')
}

export async function leaveRoom(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const roomId = formData.get('roomId') as string
  if (!roomId) return

  // Check the leaving user's role
  const { data: myMembership } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .single()

  const isAdmin = myMembership?.role === 'admin'

  // Get all other active members in order of who joined first
  const { data: otherMembers } = await supabase
    .from('room_members')
    .select('user_id, role, joined_at')
    .eq('room_id', roomId)
    .eq('status', 'active')
    .neq('user_id', user.id)
    .order('joined_at', { ascending: true })

  if (!otherMembers || otherMembers.length === 0) {
    // Last member leaving → delete the room entirely
    await fullDeleteRoom(supabase, roomId)
    revalidatePath('/dashboard', 'layout')
    redirect('/dashboard')
  }

  // Get room name and leaving user's name for notifications
  const [{ data: roomInfo }, { data: leavingUser }] = await Promise.all([
    supabase.from('rooms').select('name').eq('id', roomId).single(),
    supabase.from('users').select('name').eq('id', user.id).single(),
  ])

  // If admin is leaving and there are other members, promote the next one
  if (isAdmin) {
    const nextAdmin = otherMembers.find(m => m.role !== 'admin') || otherMembers[0]

    await supabase
      .from('room_members')
      .update({ role: 'admin' })
      .eq('room_id', roomId)
      .eq('user_id', nextAdmin.user_id)

    await createNotification(supabase, {
      userIds: [nextAdmin.user_id],
      actorId: user.id,
      roomId,
      type: 'room_update',
      message: `${leavingUser?.name || 'The admin'} left "${roomInfo?.name || 'the room'}". You are now the admin.`,
    })
  }

  // Notify all remaining members that the user left
  const membersToNotify = isAdmin
    ? otherMembers.filter(m => m.user_id !== (otherMembers.find(a => a.role !== 'admin') || otherMembers[0]).user_id) // Exclude the new admin who already got a specific message
    : otherMembers

  if (membersToNotify.length > 0) {
    await createNotification(supabase, {
      userIds: membersToNotify.map(m => m.user_id),
      actorId: user.id,
      roomId,
      type: 'member_left',
      message: `${leavingUser?.name || 'A member'} left "${roomInfo?.name || 'the room'}".`,
    })
  }

  // Remove the leaving user
  await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', user.id)

  revalidatePath('/dashboard', 'layout')
  const redirectTo = formData.get('redirectTo') as string | null
  redirect(redirectTo || '/dashboard')
}

export async function setNepaliMode(enabled: boolean) {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  cookieStore.set('useNepali', enabled ? 'true' : 'false', { path: '/' })
  revalidatePath('/', 'layout')
}

// Helper function to wipe all room data and delete the room (manual cascade)
async function fullDeleteRoom(supabase: any, roomId: string) {
  // 1. Delete all expenses and their splits
  const { data: expenses } = await supabase.from('expenses').select('id').eq('room_id', roomId)
  if (expenses && expenses.length > 0) {
    const expenseIds = expenses.map((e: any) => e.id)
    await supabase.from('expense_splits').delete().in('expense_id', expenseIds)
    await supabase.from('expenses').delete().in('id', expenseIds)
  }

  // 2. Delete all other related records
  await supabase.from('settlements').delete().eq('room_id', roomId)
  await supabase.from('activity_logs').delete().eq('room_id', roomId)
  await supabase.from('notifications').delete().eq('room_id', roomId)
  
  // 3. Delete members and the room itself
  await supabase.from('room_members').delete().eq('room_id', roomId)
  await supabase.from('rooms').delete().eq('id', roomId)
}

export async function deleteRoom(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const roomId = formData.get('roomId') as string
  if (!roomId) return

  // Verify admin
  const { data: membership } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'admin') return

  // Manually delete all related records then the room to avoid foreign key / RLS cascade issues
  await fullDeleteRoom(supabase, roomId)

  revalidatePath('/dashboard', 'layout')
  const redirectTo = formData.get('redirectTo') as string | null
  redirect(redirectTo || '/dashboard')
}

export async function updateRoomApprovalSetting(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const roomId = formData.get('roomId') as string
  const requireApproval = formData.get('requireApproval') === 'on'

  if (!roomId) return

  // Verify admin
  const { data: membership } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'admin') return

  await supabase
    .from('rooms')
    .update({ require_approval: requireApproval })
    .eq('id', roomId)

  revalidatePath('/dashboard', 'layout')
}

export async function approveMember(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const roomId = formData.get('roomId') as string
  const targetUserId = formData.get('targetUserId') as string

  if (!roomId || !targetUserId) return

  // Verify admin
  const { data: membership } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'admin') return

  await supabase
    .from('room_members')
    .update({ status: 'active' })
    .eq('room_id', roomId)
    .eq('user_id', targetUserId)

  // Notify the approved user
  const { data: roomInfo } = await supabase.from('rooms').select('name').eq('id', roomId).single()
  await createNotification(supabase, {
    userIds: [targetUserId],
    actorId: user.id,
    roomId,
    type: 'joined_room',
    message: `Your request to join ${roomInfo?.name || 'a room'} was approved!`
  })
  
  // Notify existing members
  const { data: targetProfile } = await supabase.from('users').select('name').eq('id', targetUserId).single()
  const { data: members } = await supabase.from('room_members').select('user_id').eq('room_id', roomId).neq('user_id', targetUserId).eq('status', 'active')
  
  if (members) {
    await createNotification(supabase, {
      userIds: members.map(m => m.user_id),
      actorId: targetUserId,
      roomId,
      type: 'member_joined',
      message: `${targetProfile?.name || 'A new member'} joined ${roomInfo?.name || 'the room'}`
    })
  }

  revalidatePath('/dashboard', 'layout')
}

export async function rejectMember(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const roomId = formData.get('roomId') as string
  const targetUserId = formData.get('targetUserId') as string

  if (!roomId || !targetUserId) return

  // Verify admin
  const { data: membership } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'admin') return

  await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', targetUserId)

  revalidatePath('/dashboard', 'layout')
}

export async function promoteToAdmin(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const roomId = formData.get('roomId') as string
  const targetUserId = formData.get('targetUserId') as string

  if (!roomId || !targetUserId) return

  // Verify caller is admin
  const { data: membership } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'admin') return

  // Promote the member to admin
  await supabase
    .from('room_members')
    .update({ role: 'admin' })
    .eq('room_id', roomId)
    .eq('user_id', targetUserId)

  // Notify the newly promoted user
  const { data: roomInfo } = await supabase.from('rooms').select('name').eq('id', roomId).single()
  const { data: callerProfile } = await supabase.from('users').select('name').eq('id', user.id).single()

  await createNotification(supabase, {
    userIds: [targetUserId],
    actorId: user.id,
    roomId,
    type: 'promoted_to_admin',
    message: `${callerProfile?.name || 'An admin'} made you an admin in ${roomInfo?.name || 'a room'} 🎉`
  })

  revalidatePath('/dashboard', 'layout')
}

export async function kickMember(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const roomId = formData.get('roomId') as string
  const targetUserId = formData.get('targetUserId') as string

  if (!roomId || !targetUserId) return

  // Verify caller is admin
  const { data: membership } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'admin') return

  // Delete the user from the room
  await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', targetUserId)

  // Notify the kicked user
  const { data: roomInfo } = await supabase.from('rooms').select('name').eq('id', roomId).single()
  const { data: callerProfile } = await supabase.from('users').select('name').eq('id', user.id).single()
  const { data: targetProfile } = await supabase.from('users').select('name').eq('id', targetUserId).single()

  await createNotification(supabase, {
    userIds: [targetUserId],
    actorId: user.id,
    roomId,
    type: 'room_update',
    message: `${callerProfile?.name || 'An admin'} removed you from ${roomInfo?.name || 'the room'}.`
  })

  // Notify other remaining members
  const { data: otherMembers } = await supabase
    .from('room_members')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('status', 'active')

  if (otherMembers && otherMembers.length > 0) {
    await createNotification(supabase, {
      userIds: otherMembers.map(m => m.user_id),
      actorId: user.id,
      roomId,
      type: 'member_left',
      message: `${targetProfile?.name || 'A member'} was removed from ${roomInfo?.name || 'the room'}.`
    })
  }

  revalidatePath('/dashboard', 'layout')
}

export async function updateUserProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const name = formData.get('name') as string
  if (!name || name.trim() === '') return

  await supabase
    .from('users')
    .update({ name: name.trim() })
    .eq('id', user.id)

  revalidatePath('/dashboard', 'layout')
}

export async function cancelJoinRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const roomId = formData.get('roomId') as string
  if (!roomId) return

  await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .eq('status', 'pending')

  revalidatePath('/dashboard', 'layout')
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  revalidatePath('/dashboard', 'layout')
}

export async function updateExpensePreferences(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const allowOthers = formData.get('allowOthers') === 'on'
  const requireApproval = formData.get('requireApproval') === 'on'

  await supabase
    .from('users')
    .update({ 
      allow_others_to_add: allowOthers,
      require_expense_approval: requireApproval
    })
    .eq('id', user.id)

  revalidatePath('/dashboard/profile', 'page')
}

export async function approveExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const expenseId = formData.get('expenseId') as string
  if (!expenseId) return

  // User must be the payer to approve
  await supabase
    .from('expenses')
    .update({ approval_status: 'approved' })
    .eq('id', expenseId)
    .eq('payer_id', user.id)
    .eq('approval_status', 'pending')

  revalidatePath('/dashboard', 'layout')
}

export async function rejectExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const expenseId = formData.get('expenseId') as string
  if (!expenseId) return

  // User must be the payer to reject
  await supabase
    .from('expenses')
    .update({ approval_status: 'rejected' })
    .eq('id', expenseId)
    .eq('payer_id', user.id)
    .eq('approval_status', 'pending')

  revalidatePath('/dashboard', 'layout')
}

export async function markAllNotificationsAsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  revalidatePath('/dashboard', 'layout')
}

export async function resetRoomData(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const roomId = formData.get('roomId') as string
  if (!roomId) return

  // Only admins can reset room data
  const { data: membership } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'admin') {
    return
  }

  // Delete in order: splits → expenses → settlements → activity_logs → notifications
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id')
    .eq('room_id', roomId)

  if (expenses && expenses.length > 0) {
    const expenseIds = expenses.map(e => e.id)
    await supabase.from('expense_splits').delete().in('expense_id', expenseIds)
    await supabase.from('expenses').delete().in('id', expenseIds)
  }

  await supabase.from('settlements').delete().eq('room_id', roomId)
  await supabase.from('activity_logs').delete().eq('room_id', roomId)
  await supabase.from('notifications').delete().eq('room_id', roomId)

  revalidatePath('/dashboard', 'layout')
}
