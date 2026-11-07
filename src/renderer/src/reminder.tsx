import { StrictMode, useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import type { PendingReminder } from "../../shared/scheduler"
import chimeUrl from "./assets/chime.wav"
import "./theme.css"
import "./reminder.css"

const SNOOZE_MINUTES = [5, 10, 30]

function ReminderApp() {
  const [reminders, setReminders] = useState<PendingReminder[]>([])
  const [snoozeFor, setSnoozeFor] = useState<string | null>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousIds = useRef<string[]>([])

  useEffect(() => {
    audioRef.current = new Audio(chimeUrl)
    void window.dateloom.getReminders().then(setReminders)
    return window.dateloom.onRemindersChanged(setReminders)
  }, [])

  useEffect(() => {
    const hasNew = reminders.some((reminder) => !previousIds.current.includes(reminder.id))
    previousIds.current = reminders.map((reminder) => reminder.id)

    if (!hasNew || !audioRef.current) return
    audioRef.current.currentTime = 0
    void audioRef.current.play().catch(() => {})
  }, [reminders])

  useEffect(() => {
    const element = stackRef.current
    if (!element) return

    const report = () => window.dateloom.reportReminderHeight(Math.ceil(element.getBoundingClientRect().height))
    report()
    const observer = new ResizeObserver(report)
    observer.observe(element)
    return () => observer.disconnect()
  }, [reminders])

  return (
    <div className="stack" ref={stackRef}>
      {reminders.map((reminder) => (
        <article className="reminder-card" key={reminder.id}>
          <div className="reminder-meta">
            {reminder.missed && <span className="reminder-badge">Missed</span>}
            <span>{formatWhen(reminder)}</span>
          </div>
          <h2 className="reminder-title">{reminder.title}</h2>
          <div className="reminder-actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                void window.dateloom.completeReminder(reminder.taskId, reminder.occurrenceDate)
              }}
            >
              Done
            </button>
            <button
              className="btn"
              onClick={() => setSnoozeFor((current) => (current === reminder.id ? null : reminder.id))}
            >
              Snooze
            </button>
            <button
              className="btn btn-quiet"
              onClick={() => {
                void window.dateloom.dismissReminder(reminder.taskId, reminder.occurrenceDate)
              }}
            >
              Dismiss
            </button>
          </div>
          {snoozeFor === reminder.id && (
            <div className="snooze-menu">
              {SNOOZE_MINUTES.map((minutes) => (
                <button
                  key={minutes}
                  className="btn"
                  onClick={() => {
                    void window.dateloom.snoozeReminder(reminder.taskId, reminder.occurrenceDate, minutes)
                    setSnoozeFor(null)
                  }}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  )
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatWhen(reminder: PendingReminder): string {
  const today = new Date()
  const [year, month, day] = reminder.occurrenceDate.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  if (isToday) return reminder.time
  return `${WEEKDAY_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}, ${reminder.time}`
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ReminderApp />
  </StrictMode>
)
