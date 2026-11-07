import { useEffect, useRef, useState } from "react"
import { monthTitle, type MonthCursor } from "../lib/dates"

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

type Props = {
  cursor: MonthCursor
  panelOpen: boolean
  dark: boolean
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onTogglePanel: () => void
  onToggleTheme: () => void
  onSelect: (cursor: MonthCursor) => void
}

export function MonthHeader({
  cursor,
  panelOpen,
  dark,
  onPrevious,
  onNext,
  onToday,
  onTogglePanel,
  onToggleTheme,
  onSelect
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(cursor.year)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pickerOpen) setPickerYear(cursor.year)
  }, [pickerOpen, cursor.year])

  useEffect(() => {
    if (!pickerOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (pickerRef.current?.contains(event.target as Node)) return
      setPickerOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false)
    }

    window.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [pickerOpen])

  return (
    <header className="topbar">
      <div className="title-wrap" ref={pickerRef}>
        <button
          className="month-title-btn"
          onClick={() => setPickerOpen((open) => !open)}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          title="Jump to month or year"
        >
          {monthTitle(cursor)}
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="title-caret">
            <polyline
              points="2.5 4.5 6 8 9.5 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {pickerOpen && (
          <div className="month-picker" role="dialog" aria-label="Jump to month">
            <div className="picker-year">
              <button
                className="btn btn-icon btn-quiet"
                onClick={() => setPickerYear((year) => year - 1)}
                aria-label="Previous year"
              >
                <Chevron direction="left" />
              </button>
              <span className="picker-year-label">{pickerYear}</span>
              <button
                className="btn btn-icon btn-quiet"
                onClick={() => setPickerYear((year) => year + 1)}
                aria-label="Next year"
              >
                <Chevron direction="right" />
              </button>
            </div>
            <div className="picker-months">
              {MONTH_SHORT.map((label, month) => (
                <button
                  key={label}
                  className={`picker-month ${
                    pickerYear === cursor.year && month === cursor.month ? "is-current" : ""
                  }`}
                  onClick={() => {
                    onSelect({ year: pickerYear, month })
                    setPickerOpen(false)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="picker-footer">
              <button
                className="btn btn-quiet picker-today"
                onClick={() => {
                  onToday()
                  setPickerOpen(false)
                }}
              >
                Go to today
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="header-actions">
        <button
          className="btn btn-icon"
          onClick={onToggleTheme}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          title={dark ? "Light mode" : "Dark mode"}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
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

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <line x1="8" y1="1.4" x2="8" y2="3" />
        <line x1="8" y1="13" x2="8" y2="14.6" />
        <line x1="1.4" y1="8" x2="3" y2="8" />
        <line x1="13" y1="8" x2="14.6" y2="8" />
        <line x1="3.3" y1="3.3" x2="4.5" y2="4.5" />
        <line x1="11.5" y1="11.5" x2="12.7" y2="12.7" />
        <line x1="12.7" y1="3.3" x2="11.5" y2="4.5" />
        <line x1="4.5" y1="11.5" x2="3.3" y2="12.7" />
      </g>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M13.2 9.8A5.6 5.6 0 0 1 6.2 2.8a5.6 5.6 0 1 0 7 7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
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
