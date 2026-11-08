import { isOccurrenceDismissed, isOccurrenceDone, latestOccurrence, nextOccurrence } from "./recurrence"
import { dueDateTime } from "./dates"
import type { Task } from "./types"

export const MISSED_GRACE_MS = 2 * 60 * 1000

/** Snooze presets offered in the reminder popup, in minutes. */
export const SNOOZE_MINUTES = [5, 10, 30] as const

export type PendingReminder = {
  id: string
  taskId: string
  occurrenceDate: string
  title: string
  time: string
  dueAt: string
  missed: boolean
}

export function getPendingReminders(tasks: Task[], now: Date): PendingReminder[] {
  const pending: PendingReminder[] = []

  for (const task of tasks) {
    let occurrence = nextOccurrence(task, new Date(dueDateTime(task.date, task.time).getTime() - 1))
    while (occurrence && occurrence.dueAt <= now) {
      const current = occurrence
      occurrence = nextOccurrence(task, current.dueAt)
      if (isOccurrenceDone(task, current.date)) continue
      if (isOccurrenceDismissed(task, current.date)) continue

      let dueAt = current.dueAt
      const snooze = task.snoozedDates?.[current.date] ??
        (task.snoozedFor === current.date ? task.snoozedUntil : undefined)
      if (snooze) {
        const snoozedUntil = new Date(snooze)
        if (snoozedUntil.getTime() > now.getTime()) continue
        dueAt = snoozedUntil
      }

      // Restore an unhandled card after restart without labelling an on-time firing missed.
      const legacyFired = !task.firedDates && task.lastFiredAt &&
        latestOccurrence(task, new Date(task.lastFiredAt))?.date === current.date
        ? task.lastFiredAt : undefined
      const firedAt = task.firedDates?.[current.date] ?? legacyFired
      const observedAt = firedAt && new Date(firedAt) >= dueAt ? new Date(firedAt) : now
      pending.push({
        id: `${task.id}:${current.date}`,
        taskId: task.id,
        occurrenceDate: current.date,
        title: task.title,
        time: task.time,
        dueAt: dueAt.toISOString(),
        missed: observedAt.getTime() - dueAt.getTime() > MISSED_GRACE_MS
      })
    }
  }

  return pending.sort((a, b) => a.dueAt.localeCompare(b.dueAt))
}

export function snoozedUntil(now: Date, minutes: number): string {
  return new Date(now.getTime() + minutes * 60_000).toISOString()
}
