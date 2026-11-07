const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

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

export function isValidDateKey(key: unknown): key is string {
  return typeof key === "string" && DATE_KEY_PATTERN.test(key)
}

export function isValidTime(time: unknown): time is string {
  return typeof time === "string" && TIME_PATTERN.test(time)
}

export function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number)
  return { hours, minutes }
}

export function dueDateTime(dateKey: string, time: string): Date {
  const date = fromDateKey(dateKey)
  const { hours, minutes } = parseTime(time)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes)
}

export function addDaysToKey(key: string, days: number): string {
  const date = fromDateKey(key)
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days))
}

export function daysBetweenKeys(from: string, to: string): number {
  const fromUtc = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)))
  const toUtc = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)))
  return Math.round((toUtc - fromUtc) / 86_400_000)
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}
