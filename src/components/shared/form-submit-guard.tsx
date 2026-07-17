'use client'

import { useEffect } from 'react'

const LOCK_MS = 4000

export function FormSubmitGuard() {
  useEffect(() => {
    const unlockTimers = new WeakMap<HTMLFormElement, number>()

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

    const unlock = (form: HTMLFormElement) => {
      form.dataset.submitGuardLocked = 'false'
      setSubmitControlsDisabled(form, false)
      const timer = unlockTimers.get(form)
      if (timer) window.clearTimeout(timer)
      unlockTimers.delete(form)
    }

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement)) return

      if (form.dataset.submitGuardLocked === 'true') {
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }

      form.dataset.submitGuardLocked = 'true'
      setSubmitControlsDisabled(form, true)

      const timer = window.setTimeout(() => unlock(form), LOCK_MS)
      unlockTimers.set(form, timer)
    }

    const handleInvalid = (event: Event) => {
      const field = event.target
      if (!(field instanceof HTMLElement)) return
      const form = field.closest('form')
      if (form) unlock(form)
    }

    document.addEventListener('submit', handleSubmit, true)
    document.addEventListener('invalid', handleInvalid, true)

    return () => {
      document.removeEventListener('submit', handleSubmit, true)
      document.removeEventListener('invalid', handleInvalid, true)
    }
  }, [])

  return null
}