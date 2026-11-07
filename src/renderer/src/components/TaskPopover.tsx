import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react"
import { isOccurrenceDone, occurrencesOn } from "../../../shared/recurrence"
import type { RepeatRule, Task } from "../../../shared/types"
import { formatDayLabel, nextFullHour } from "../lib/dates"

const POPOVER_WIDTH = 300

function positionPopover(anchor: DOMRect, height: number): { left: number; top: number } {
  const left = Math.min(Math.max(anchor.left, 8), window.innerWidth - POPOVER_WIDTH - 8)
  const below = anchor.bottom + 6
  const top = below + height > window.innerHeight - 8 ? Math.max(8, anchor.top - height - 6) : below
  return { left, top }
}

type EditorProps = {
  mode: "add" | "edit"
  date: string
  occurrenceDate: string
  task?: Task
  anchor: DOMRect
  containerRef: RefObject<HTMLDivElement | null>
  onClose: () => void
}

export function TaskEditorPopover({
  mode,
  date,
  occurrenceDate,
  task,
  anchor,
  containerRef,
  onClose
}: EditorProps) {
  const [title, setTitle] = useState(task?.title ?? "")
  const [time, setTime] = useState(task?.time ?? nextFullHour())
  const [repeat, setRepeat] = useState<RepeatRule>(task?.repeat ?? "none")
  const titleRef = useRef<HTMLInputElement>(null)
  const { left, top } = positionPopover(anchor, mode === "add" ? 210 : 280)
  const done = task ? isOccurrenceDone(task, occurrenceDate) : false

  useEffect(() => {
    titleRef.current?.focus()
    titleRef.current?.select()
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      titleRef.current?.focus()
      return
    }

    if (mode === "add") {
      await window.dateloom.addTask({ title: trimmed, date, time, repeat })
    } else if (task) {
      await window.dateloom.updateTask(task.id, { title: trimmed, time, repeat })
    }
    onClose()
  }

  return (
    <div
      className="popover"
      style={{ left, top }}
      ref={containerRef}
      role="dialog"
      aria-label={mode === "add" ? "New task" : "Edit task"}
    >
      <form onSubmit={handleSubmit}>
        <input
          ref={titleRef}
          className="field-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What's this?"
          aria-label="Title"
        />
        <div className="field-row">
          <label className="field">
            <span>Time</span>
            <input
              type="time"
              className="input"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Repeat</span>
            <select
              className="input"
              value={repeat}
              onChange={(event) => setRepeat(event.target.value as RepeatRule)}
            >
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
        </div>

        {mode === "edit" && task && (
          <div className="edit-actions">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={async () => {
                await window.dateloom.toggleDone(task.id, occurrenceDate)
                onClose()
              }}
            >
              {done ? "Mark not done" : "Mark done"}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                await window.dateloom.deleteTask(task.id)
                onClose()
              }}
            >
              Delete
            </button>
          </div>
        )}

        <div className="popover-footer">
          <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
            {mode === "add" ? "Add" : "Save"}
          </button>
        </div>
      </form>
    </div>
  )
}

type ListProps = {
  date: string
  tasks: Task[]
  anchor: DOMRect
  containerRef: RefObject<HTMLDivElement | null>
  onEdit: (taskId: string) => void
}

export function DayListPopover({ date, tasks, anchor, containerRef, onEdit }: ListProps) {
  const items = occurrencesOn(tasks, date)
  const { left, top } = positionPopover(anchor, Math.min(60 + items.length * 28, 320))

  return (
    <div className="popover popover-list" style={{ left, top }} ref={containerRef} role="dialog" aria-label="Day tasks">
      <div className="popover-heading">{formatDayLabel(date)}</div>
      {items.length === 0 && <p className="empty-note">Nothing scheduled.</p>}
      {items.map((task) => {
        const done = isOccurrenceDone(task, date)
        return (
          <button key={task.id} className="list-row" onClick={() => onEdit(task.id)}>
            <span className="list-time">{task.time}</span>
            <span className={`list-title ${done ? "is-done" : ""}`}>{task.title}</span>
          </button>
        )
      })}
    </div>
  )
}
