import { monthTitle, type MonthCursor } from "../lib/dates"

type Props = {
  cursor: MonthCursor
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

export function MonthHeader({ cursor, onPrevious, onNext, onToday }: Props) {
  return (
    <header className="topbar">
      <h1 className="month-title">{monthTitle(cursor)}</h1>
      <div className="nav">
        <button className="btn btn-icon" onClick={onPrevious} aria-label="Previous month">
          <Chevron direction="left" />
        </button>
        <button className="btn" onClick={onToday}>
          Today
        </button>
        <button className="btn btn-icon" onClick={onNext} aria-label="Next month">
          <Chevron direction="right" />
        </button>
      </div>
    </header>
  )
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <polyline
        points={direction === "left" ? "10.5 3.5 5 8 10.5 12.5" : "5.5 3.5 11 8 5.5 12.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
