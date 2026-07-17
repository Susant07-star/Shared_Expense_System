'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { settleUp } from '@/app/dashboard/actions'

export function SettleButton({
  roomId,
  payeeId,
  payeeName,
  amount,
}: {
  roomId: string
  payeeId: string
  payeeName: string
  amount: number
}) {
  const [open, setOpen] = useState(false)
  const [locked, setLocked] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const isBusy = locked || isPending

  const handleConfirm = () => {
    if (isBusy) return
    setLocked(true)

    const formData = new FormData()
    formData.set('roomId', roomId)
    formData.set('payeeId', payeeId)
    formData.set('amount', String(amount))

    startTransition(async () => {
      try {
        await settleUp(formData)
        setOpen(false)
        router.refresh()
      } finally {
        setLocked(false)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (!value) setLocked(false)
      }}
    >
      <DialogTrigger render={
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-rose-200 px-2.5 text-xs text-rose-700 transition-all hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/40"
        >
          Mark Paid
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Payment</DialogTitle>
          <DialogDescription>
            Are you sure you want to mark this balance as paid to {payeeName}?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isBusy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isBusy} aria-busy={isBusy}>
            {isBusy ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}