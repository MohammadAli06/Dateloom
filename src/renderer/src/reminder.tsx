import { StrictMode, useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { SNOOZE_MINUTES, type PendingReminder } from "../../shared/scheduler"
import chimeUrl from "./assets/chime.wav"
import "./theme.css"
import "./reminder.css"

/** Round-trips a local date to the `YYYY-MM-DDTHH:mm` an `input[type=datetime-local]` expects. */
function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultCustomTime(): string {
  const now = new Date()
  return toLocalInput(new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, now.getMinutes()))
}

function startOfTomorrow(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0)
}

function ReminderApp() {
  const [reminders, setReminders] = useState<PendingReminder[]>([])
  const [snoozeFor, setSnoozeFor] = useState<string | null>(null)
  const [customFor, setCustomFor] = useState<string | null>(null)
  const [customAt, setCustomAt] = useState(defaultCustomTime)
  const stackRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousIds = useRef<string[]>([])

  useEffect(() => {
    audioRef.current = new Audio(chimeUrl)
    void window.dateloom.getReminders().then(setReminders)
    return window.dateloom.onRemindersChanged(setReminders)
  }, [])

  // The window only accepts keyboard focus while a custom picker is open.
  useEffect(() => {
    window.dateloom.setRemindersFocusable(customFor !== null)
  }, [customFor])

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

  function snoozeUntil(reminder: PendingReminder, until: Date) {
    void window.dateloom.snoozeReminder(reminder.taskId, reminder.occurrenceDate, until.toISOString())
    setSnoozeFor(null)
    setCustomFor(null)
  }

  function openCustom(reminder: PendingReminder) {
    setCustomFor(reminder.id)
    setCustomAt(defaultCustomTime())
  }

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
              onClick={() => {
                setCustomFor(null)
                setSnoozeFor((current) => (current === reminder.id ? null : reminder.id))
              }}
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
                  onClick={() => snoozeUntil(reminder, new Date(Date.now() + minutes * 60_000))}
                >
                  {minutes} min
                </button>
              ))}
              <button className="btn" onClick={() => snoozeUntil(reminder, startOfTomorrow())}>
                Tomorrow 9am
              </button>
              <button className="btn" onClick={() => openCustom(reminder)}>
                Pick date…
              </button>
            </div>
          )}

          {customFor === reminder.id && (
            <div className="custom-snooze">
              <input
                type="datetime-local"
                className="input"
                value={customAt}
                autoFocus
                onChange={(event) => setCustomAt(event.target.value)}
              />
              <div className="snooze-menu">
                <button
                  className="btn btn-primary"
                  disabled={!customAt}
                  onClick={() => {
                    const until = new Date(customAt)
                    if (Number.isNaN(until.getTime())) return
                    snoozeUntil(reminder, until)
                  }}
                >
                  Snooze
                </button>
                <button className="btn btn-quiet" onClick={() => setCustomFor(null)}>
                  Cancel
                </button>
              </div>
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
