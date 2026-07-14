'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose
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
  const [isPending, startTransition] = useTransition()

  return (
    <Dialog>
      <DialogTrigger render={
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          className="text-xs h-7 px-2.5 border-rose-200 hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 transition-all"
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
          <DialogClose render={<Button variant="ghost">Cancel</Button>} />
          <form
            action={(formData) => {
              startTransition(async () => {
                await settleUp(formData)
              })
            }}
          >
            <input type="hidden" name="roomId" value={roomId} />
            <input type="hidden" name="payeeId" value={payeeId} />
            <input type="hidden" name="amount" value={amount} />
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Processing…' : 'Confirm'}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
