import { useEffect, useState } from "react"
import { MonthGrid } from "./components/MonthGrid"
import { MonthHeader } from "./components/MonthHeader"
import { addMonths, monthCursorOf, type MonthCursor } from "./lib/dates"

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest("input, textarea, select, [contenteditable='true']") !== null
  )
}

export default function App() {
  const [cursor, setCursor] = useState<MonthCursor>(() => monthCursorOf(new Date()))

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping(event.target)) return

      if (event.key === "ArrowLeft") {
        setCursor((current) => addMonths(current, -1))
      } else if (event.key === "ArrowRight") {
        setCursor((current) => addMonths(current, 1))
      } else if (event.key.toLowerCase() === "t") {
        setCursor(monthCursorOf(new Date()))
      } else {
        return
      }

      event.preventDefault()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="app">
      <MonthHeader
        cursor={cursor}
        onPrevious={() => setCursor((current) => addMonths(current, -1))}
        onNext={() => setCursor((current) => addMonths(current, 1))}
        onToday={() => setCursor(monthCursorOf(new Date()))}
      />
      <MonthGrid cursor={cursor} />
    </div>
  )
}
