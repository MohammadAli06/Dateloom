import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { isOccurrenceDone, occursOn } from "../../../shared/recurrence"
import type { Task } from "../../../shared/types"
import {
  buildMonthGrid,
  isSameDay,
  isSameMonth,
  toDateKey,
  WEEKDAY_LABELS,
  type MonthCursor
} from "../lib/dates"

const TASK_ROW_HEIGHT = 18
const CELL_VERTICAL_PADDING = 16
const DAY_NUMBER_HEIGHT = 22
const CELL_GAP = 4

type Props = {
  cursor: MonthCursor
  tasks: Task[]
  onAdd: (dateKey: string, anchor: DOMRect) => void
  onEdit: (taskId: string, dateKey: string, anchor: DOMRect) => void
  onMore: (dateKey: string, anchor: DOMRect) => void
}

export function MonthGrid({ cursor, tasks, onAdd, onEdit, onMore }: Props) {
  const days = useMemo(() => buildMonthGrid(cursor), [cursor])
  const gridRef = useRef<HTMLDivElement>(null)
  const [cellHeight, setCellHeight] = useState(0)
  const today = new Date()

  useLayoutEffect(() => {
    const element = gridRef.current
    if (!element) return

    const measure = () => setCellHeight((element.clientHeight - 2) / (days.length / 7))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [days.length])

  const visibleLimit = Math.max(
    0,
    Math.floor((cellHeight - CELL_VERTICAL_PADDING - DAY_NUMBER_HEIGHT - CELL_GAP) / TASK_ROW_HEIGHT)
  )

  return (
    <div className="calendar">
      <div className="weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div className="weekday" key={label}>
            {label}
          </div>
        ))}
      </div>
      <div className="days" ref={gridRef}>
        {days.map((day) => {
          const dateKey = toDateKey(day)
          const classes = ["day-cell"]
          if (!isSameMonth(day, cursor)) classes.push("is-outside")
          if (isSameDay(day, today)) classes.push("is-today")

          const dayTasks = tasks
            .filter((task) => occursOn(task, dateKey))
            .sort((a, b) => a.time.localeCompare(b.time))
          const visibleTasks =
            dayTasks.length <= visibleLimit ? dayTasks : dayTasks.slice(0, Math.max(0, visibleLimit - 1))
          const hiddenCount = dayTasks.length - visibleTasks.length

          return (
            <div
              className={classes.join(" ")}
              key={dateKey}
              onClick={(event) => onAdd(dateKey, event.currentTarget.getBoundingClientRect())}
            >
              <span className="day-number">{day.getDate()}</span>
              <div className="cell-tasks">
                {visibleTasks.map((task) => {
                  const done = isOccurrenceDone(task, dateKey)
                  return (
                    <button
                      key={task.id}
                      className={`cell-task ${done ? "is-done" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onEdit(task.id, dateKey, event.currentTarget.getBoundingClientRect())
                      }}
                    >
                      <span className="cell-task-time">{task.time}</span>
                      <span className="cell-task-title">{task.title}</span>
                    </button>
                  )
                })}
                {hiddenCount > 0 && (
                  <button
                    className="cell-more"
                    onClick={(event) => {
                      event.stopPropagation()
                      onMore(dateKey, event.currentTarget.getBoundingClientRect())
                    }}
                  >
                    +{hiddenCount} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
