/**
 * Nepali Date & Currency utilities
 *
 * Uses @sbmdkl/nepali-date-converter for accurate AD→BS conversion.
 * No hardcoded calendar data — the library maintains BS year tables
 * internally and covers BS 1975–2100.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { adToBs } = require('@sbmdkl/nepali-date-converter') as {
  adToBs: (date: string) => string
}

const NEPAL_TIME_ZONE = 'Asia/Kathmandu'

const NP_MONTHS = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
]

/**
 * Convert an AD Date to a readable BS date string.
 * e.g. "Ashadh 29, 2082 BS"
 */
export function adToBS(date: Date): string {
  // Format the AD date as 'YYYY-MM-DD' for the library
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const adStr = `${year}-${month}-${day}`

  // Returns e.g. "2082-03-29"
  const bsStr = adToBs(adStr)
  const [bsYear, bsMonth, bsDay] = bsStr.split('-').map(Number)

  // Month is 1-indexed from library, NP_MONTHS is 0-indexed
  const monthName = NP_MONTHS[bsMonth - 1] ?? `Month ${bsMonth}`
  return `${monthName} ${bsDay}, ${bsYear} BS`
}

/**
 * Format a date string from the DB for display.
 * useNepali=true → BS date, false → standard US format
 */
function getNepalDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: NEPAL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  return {
    year: Number(parts.find(part => part.type === 'year')?.value),
    month: Number(parts.find(part => part.type === 'month')?.value),
    day: Number(parts.find(part => part.type === 'day')?.value),
  }
}

export function formatDate(dateStr: string, useNepali: boolean): string {
  const date = new Date(dateStr)
  const nepalDate = getNepalDateParts(date)

  if (useNepali) {
    try {
      return adToBS(new Date(nepalDate.year, nepalDate.month - 1, nepalDate.day))
    } catch {
      /* fall through to AD format */
    }
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: NEPAL_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatTime(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: NEPAL_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

export function formatDateTime(dateStr: string, useNepali: boolean): string {
  return `${formatDate(dateStr, useNepali)}, ${formatTime(dateStr)}`
}

/**
 * Format a USD amount for display.
 * useNepali=true → converted to NPR (1 USD ≈ 135 NPR)
 */
export function formatAmount(amount: number, useNepali: boolean): string {
  if (useNepali) {
    const npr = amount * 135
    return `Rs. ${npr.toLocaleString('en-NP', { maximumFractionDigits: 0 })}`
  }
  return `$${amount.toFixed(2)}`
}
