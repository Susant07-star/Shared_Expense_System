'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { BadgeCent, DollarSign, ChevronDown, Check } from 'lucide-react'
import { setNepaliMode } from '@/app/dashboard/actions'

export function CurrencyDropdown({ initialUseNepali }: { initialUseNepali: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  const [useNepali, setUseNepali] = useState(initialUseNepali)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleCurrencyChange = (val: boolean) => {
    setUseNepali(val)
    startTransition(() => {
      setNepaliMode(val)
    })
  }

  const options = [
    {
      value: true,
      label: 'NPR / BS',
      sub: 'Nepali Rupees · Bikram Sambat',
      icon: <BadgeCent className="w-4 h-4 text-indigo-500" />,
    },
    {
      value: false,
      label: 'USD / AD',
      sub: 'US Dollar · Gregorian',
      icon: <DollarSign className="w-4 h-4 text-emerald-500" />,
    },
  ]

  const active = options.find(o => o.value === useNepali)!

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={isPending}
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200
          ${useNepali
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
            : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
          } ${isPending ? 'opacity-60 cursor-wait' : 'hover:brightness-110'}`}
      >
        {active.icon}
        {active.label}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 border rounded-xl shadow-xl z-50 overflow-hidden">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground px-3 pt-3 pb-1">
            Display Currency & Date
          </p>
          {options.map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => { handleCurrencyChange(opt.value); setOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left ${
                opt.value === useNepali ? 'bg-muted/60' : ''
              }`}
            >
              <span className="shrink-0">{opt.icon}</span>
              <span>
                <span className="block text-sm font-semibold">{opt.label}</span>
                <span className="block text-xs text-muted-foreground">{opt.sub}</span>
              </span>
              {opt.value === useNepali && (
                <Check className="w-3.5 h-3.5 ml-auto text-indigo-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
