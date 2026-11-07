import { addDaysToKey, toDateKey } from "../../../shared/dates"
import { isOccurrenceDone, occursOn } from "../../../shared/recurrence"
import type { Task } from "../../../shared/types"
import { formatDayLabel } from "../lib/dates"

type Props = {
  tasks: Task[]
}

export function SidePanel({ tasks }: Props) {
  const todayKey = toDateKey(new Date())
  const todayTasks = tasks.filter((task) => occursOn(task, todayKey)).sort(byTime)
  const upcoming = Array.from({ length: 7 }, (_, index) => addDaysToKey(todayKey, index + 1))
    .map((dateKey) => ({
      dateKey,
      tasks: tasks.filter((task) => occursOn(task, dateKey)).sort(byTime)
    }))
    .filter((group) => group.tasks.length > 0)

  return (
    <aside className="sidepanel">
      <section className="panel-section">
        <h2 className="panel-heading">Today</h2>
        {todayTasks.length === 0 ? (
          <p className="empty-note">Nothing today.</p>
        ) : (
          todayTasks.map((task) => <PanelRow key={task.id} task={task} dateKey={todayKey} />)
        )}
      </section>

      <section className="panel-section">
        <h2 className="panel-heading">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="empty-note">Nothing in the next 7 days.</p>
        ) : (
          upcoming.map((group) => (
            <div className="panel-day" key={group.dateKey}>
              <div className="panel-day-label">{formatDayLabel(group.dateKey)}</div>
              {group.tasks.map((task) => (
                <PanelRow key={task.id} task={task} dateKey={group.dateKey} />
              ))}
            </div>
          ))
        )}
      </section>
    </aside>
  )
}

function PanelRow({ task, dateKey }: { task: Task; dateKey: string }) {
  const done = isOccurrenceDone(task, dateKey)

  return (
    <div className={`panel-row ${done ? "is-done" : ""}`}>
      <button
        type="button"
        className={`check ${done ? "is-checked" : ""}`}
        aria-label={done ? "Mark not done" : "Mark done"}
        onClick={() => {
          void window.dateloom.toggleDone(task.id, dateKey)
        }}
      >
        {done && (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <polyline
              points="1.5 5.5 4 8 8.5 2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      <span className="panel-time">{task.time}</span>
      <span className="panel-title">{task.title}</span>
    </div>
  )
}

function byTime(a: Task, b: Task): number {
  return a.time.localeCompare(b.time) || a.title.localeCompare(b.title)
}
