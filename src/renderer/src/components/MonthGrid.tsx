import { useMemo } from "react"
import {
  buildMonthGrid,
  isSameDay,
  isSameMonth,
  toDateKey,
  WEEKDAY_LABELS,
  type MonthCursor
} from "../lib/dates"

type Props = {
  cursor: MonthCursor
}

export function MonthGrid({ cursor }: Props) {
  const days = useMemo(() => buildMonthGrid(cursor), [cursor])
  const today = new Date()

  return (
    <div className="calendar">
      <div className="weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div className="weekday" key={label}>
            {label}
          </div>
        ))}
      </div>
      <div className="days">
        {days.map((day) => {
          const classes = ["day-cell"]
          if (!isSameMonth(day, cursor)) classes.push("is-outside")
          if (isSameDay(day, today)) classes.push("is-today")

          return (
            <div className={classes.join(" ")} key={toDateKey(day)}>
              <span className="day-number">{day.getDate()}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
