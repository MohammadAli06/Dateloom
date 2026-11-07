import { useEffect, useState } from "react"
import { addDaysToKey } from "../../../shared/dates"
import { useToday } from "../lib/useToday"
import { isOccurrenceDone, occursOn } from "../../../shared/recurrence"
import type { ImportExportResult, StorageInfo, Task } from "../../../shared/types"
import { formatDayLabel } from "../lib/dates"

type Props = {
  tasks: Task[]
}

export function SidePanel({ tasks }: Props) {
  const todayKey = useToday()
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

      <StorageFooter />
    </aside>
  )
}

function StorageFooter() {
  const [info, setInfo] = useState<StorageInfo | null>(null)
  const [note, setNote] = useState("")

  useEffect(() => {
    void window.dateloom.getStorage().then(setInfo)
  }, [])

  if (!info) return null

  async function run(action: () => Promise<ImportExportResult>) {
    const result = await action()
    if (result.message) setNote(result.message)
  }

  return (
    <section className="panel-section storage">
      <h2 className="panel-heading">Storage</h2>
      <p className="storage-path" title={info.dir}>
        {info.isDefault ? "This computer only" : "Synced folder"}
        <br />
        <span>{info.dir}</span>
      </p>
      <button
        className="btn btn-quiet storage-btn"
        onClick={async () => {
          const next = await window.dateloom.chooseStorage()
          if (next) {
            setInfo(next)
            setNote("")
          }
        }}
      >
        Choose folder…
      </button>
      <div className="storage-row">
        <button className="btn btn-quiet storage-btn" onClick={() => run(window.dateloom.importTasks)}>
          Import…
        </button>
        <button className="btn btn-quiet storage-btn" onClick={() => run(window.dateloom.exportTasks)}>
          Export…
        </button>
      </div>
      {!info.isDefault && (
        <button
          className="btn btn-quiet storage-btn"
          onClick={async () => {
            setInfo(await window.dateloom.resetStorage())
            setNote("")
          }}
        >
          Use this computer only
        </button>
      )}
      {note && <p className="storage-note">{note}</p>}
    </section>
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
