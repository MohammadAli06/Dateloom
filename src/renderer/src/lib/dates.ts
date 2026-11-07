export type MonthCursor = {
  year: number
  month: number
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
]

export function toDateKey(date: Date): string {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function monthCursorOf(date: Date): MonthCursor {
  return { year: date.getFullYear(), month: date.getMonth() }
}

export function addMonths(cursor: MonthCursor, delta: number): MonthCursor {
  const shifted = new Date(cursor.year, cursor.month + delta, 1)
  return { year: shifted.getFullYear(), month: shifted.getMonth() }
}

export function monthTitle(cursor: MonthCursor): string {
  return `${MONTH_NAMES[cursor.month]} ${cursor.year}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isSameMonth(date: Date, cursor: MonthCursor): boolean {
  return date.getFullYear() === cursor.year && date.getMonth() === cursor.month
}

/**
 * Returns the full Monday-first grid for a month: 35 cells for months that fit
 * in five weeks, 42 for those that need six.
 */
export function buildMonthGrid(cursor: MonthCursor): Date[] {
  const first = new Date(cursor.year, cursor.month, 1)
  const leadingDays = (first.getDay() + 6) % 7
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const rowCount = Math.max(5, Math.ceil((leadingDays + daysInMonth) / 7))

  return Array.from(
    { length: rowCount * 7 },
    (_, index) => new Date(cursor.year, cursor.month, 1 - leadingDays + index)
  )
}
