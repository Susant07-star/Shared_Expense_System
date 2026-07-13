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
export function formatDate(dateStr: string, useNepali: boolean): string {
  const date = new Date(dateStr)
  if (useNepali) {
    try {
      return adToBS(date)
    } catch {
      /* fall through to AD format */
    }
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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
