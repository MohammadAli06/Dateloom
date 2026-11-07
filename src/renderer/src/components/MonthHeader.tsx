import { monthTitle, type MonthCursor } from "../lib/dates"

type Props = {
  cursor: MonthCursor
  panelOpen: boolean
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onTogglePanel: () => void
}

export function MonthHeader({ cursor, panelOpen, onPrevious, onNext, onToday, onTogglePanel }: Props) {
  return (
    <header className="topbar">
      <h1 className="month-title">{monthTitle(cursor)}</h1>
      <div className="header-actions">
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
        <button
          className="btn btn-icon"
          onClick={onTogglePanel}
          aria-label={panelOpen ? "Hide side panel" : "Show side panel"}
          aria-pressed={panelOpen}
        >
          <PanelIcon open={panelOpen} />
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

function PanelIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect
        x="2"
        y="3"
        width="12"
        height="10"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <line x1="9.5" y1="3" x2="9.5" y2="13" stroke="currentColor" strokeWidth="1.3" />
      {open && <rect x="10.8" y="5.4" width="2" height="5.2" rx="0.8" fill="currentColor" />}
    </svg>
  )
}
