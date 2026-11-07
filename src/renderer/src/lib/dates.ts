import { fromDateKey } from "../../../shared/dates"

export type MonthCursor = {
  year: number
  month: number
}

export { fromDateKey, toDateKey } from "../../../shared/dates"

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

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

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

export function formatDayLabel(dateKey: string): string {
  const date = fromDateKey(dateKey)
  return `${WEEKDAY_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`
}

export function nextFullHour(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0)
  return `${String(next.getHours()).padStart(2, "0")}:00`
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
