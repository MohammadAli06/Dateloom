import { isOccurrenceDismissed, isOccurrenceDone, latestOccurrence } from "./recurrence"
import type { Task } from "./types"

export const MISSED_GRACE_MS = 2 * 60 * 1000

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
    const occurrence = latestOccurrence(task, now)
    if (!occurrence) continue
    if (isOccurrenceDone(task, occurrence.date)) continue
    if (isOccurrenceDismissed(task, occurrence.date)) continue

    let dueAt = occurrence.dueAt
    if (task.snoozedFor === occurrence.date && task.snoozedUntil) {
      const snoozedUntil = new Date(task.snoozedUntil)
      if (snoozedUntil.getTime() > now.getTime()) continue
      dueAt = snoozedUntil
    }

    pending.push({
      id: `${task.id}:${occurrence.date}`,
      taskId: task.id,
      occurrenceDate: occurrence.date,
      title: task.title,
      time: task.time,
      dueAt: dueAt.toISOString(),
      missed: now.getTime() - dueAt.getTime() > MISSED_GRACE_MS
    })
  }

  return pending.sort((a, b) => a.dueAt.localeCompare(b.dueAt))
}

export function snoozedUntil(now: Date, minutes: number): string {
  return new Date(now.getTime() + minutes * 60_000).toISOString()
}
