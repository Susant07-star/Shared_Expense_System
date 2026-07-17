'use client'

import { useEffect } from 'react'

const LOCK_MS = 4000
const CLICK_LOCK_MS = 1200

export function FormSubmitGuard() {
  useEffect(() => {
    const unlockTimers = new WeakMap<HTMLFormElement, number>()
    const clickTimers = new WeakMap<HTMLFormElement, number>()

    const setSubmitControlsDisabled = (form: HTMLFormElement, disabled: boolean) => {
      const controls = form.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
        'button[type="submit"], button:not([type]), input[type="submit"]'
      )

      controls.forEach(control => {
        if (disabled) {
          if (!control.disabled) control.dataset.submitGuardEnabled = 'true'
          control.disabled = true
          control.setAttribute('aria-busy', 'true')
        } else if (control.dataset.submitGuardEnabled === 'true') {
          control.disabled = false
          control.removeAttribute('aria-busy')
          delete control.dataset.submitGuardEnabled
        }
      })
    }

    const clearClickLock = (form: HTMLFormElement) => {
      form.dataset.submitGuardClickLocked = 'false'
      const clickTimer = clickTimers.get(form)
      if (clickTimer) window.clearTimeout(clickTimer)
      clickTimers.delete(form)
    }

    const unlock = (form: HTMLFormElement) => {
      form.dataset.submitGuardLocked = 'false'
      clearClickLock(form)
      setSubmitControlsDisabled(form, false)
      const timer = unlockTimers.get(form)
      if (timer) window.clearTimeout(timer)
      unlockTimers.delete(form)
    }

    const lockForm = (form: HTMLFormElement) => {
      if (form.dataset.submitGuardLocked === 'true') return false
      form.dataset.submitGuardLocked = 'true'
      clearClickLock(form)
      setSubmitControlsDisabled(form, true)
      const timer = window.setTimeout(() => unlock(form), LOCK_MS)
      unlockTimers.set(form, timer)
      return true
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return

      const submitControl = target.closest<HTMLButtonElement | HTMLInputElement>(
        'button[type="submit"], button:not([type]), input[type="submit"]'
      )
      const form = submitControl?.form
      if (!submitControl || !form || submitControl.disabled) return

      if (form.dataset.submitGuardLocked === 'true' || form.dataset.submitGuardClickLocked === 'true') {
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }

      if (!form.reportValidity()) return

      form.dataset.submitGuardClickLocked = 'true'
      const timer = window.setTimeout(() => clearClickLock(form), CLICK_LOCK_MS)
      clickTimers.set(form, timer)
    }

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement)) return

      if (form.dataset.submitGuardLocked === 'true') {
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }

      lockForm(form)
    }

    const handleInvalid = (event: Event) => {
      const field = event.target
      if (!(field instanceof HTMLElement)) return
      const form = field.closest('form')
      if (form) unlock(form)
    }

    document.addEventListener('click', handleClick, true)
    document.addEventListener('submit', handleSubmit, true)
    document.addEventListener('invalid', handleInvalid, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('submit', handleSubmit, true)
      document.removeEventListener('invalid', handleInvalid, true)
    }
  }, [])

  return null
}
