'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  revalidatePath('/dashboard', 'layout')
  redirect(`/dashboard?room=${room.id}`)
}

export async function addExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const roomId = formData.get('roomId') as string
  const description = formData.get('description') as string
  const amount = parseFloat(formData.get('amount') as string)
  const type = formData.get('type') as 'shared' | 'personal'

  if (!roomId || !description || isNaN(amount)) {
    return { error: 'Invalid input' }
  }

  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert([{
      room_id: roomId,
      created_by: user.id,
      payer_id: user.id,
      amount,
      description,
      type,
      status: 'paid'
    }])
    .select()
    .single()

  if (expenseError || !expense) {
    return { error: expenseError?.message || 'Failed to add expense' }
  }

  if (type === 'shared') {
    const { data: members } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId)
    
    if (members && members.length > 0) {
      const splitAmount = amount / members.length
      const splits = members.map(m => ({
        expense_id: expense.id,
        user_id: m.user_id,
        amount_owed: splitAmount
      }))
      
      await supabase.from('expense_splits').insert(splits)
    }
  }

  await supabase.from('activity_logs').insert([{
    room_id: roomId,
    user_id: user.id,
    action_type: 'expense_added',
    metadata: { description, amount, type }
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

  await supabase.from('activity_logs').insert([{
    room_id: roomId,
    user_id: user.id,
    action_type: 'settled_up',
    metadata: { amount, payeeId }
  }])

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

  await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', user.id)

  revalidatePath('/dashboard', 'layout')
}

export async function setNepaliMode(enabled: boolean) {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  cookieStore.set('useNepali', enabled ? 'true' : 'false', { path: '/' })
  revalidatePath('/', 'layout')
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

  // Note: For this to work, public.rooms needs a FOR DELETE RLS policy for admins.
  await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId)

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
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
