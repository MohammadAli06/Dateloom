import { useCallback, useEffect, useRef, useState } from "react"
import type { Task } from "../../shared/types"
import { MonthGrid } from "./components/MonthGrid"
import { MonthHeader } from "./components/MonthHeader"
import { SidePanel } from "./components/SidePanel"
import { DayListPopover, TaskEditorPopover } from "./components/TaskPopover"
import { addMonths, monthCursorOf, type MonthCursor } from "./lib/dates"

type PopoverState =
  | { kind: "add"; date: string; anchor: DOMRect }
  | { kind: "edit"; taskId: string; date: string; anchor: DOMRect }
  | { kind: "list"; date: string; anchor: DOMRect }

const PANEL_KEY = "dateloom.sidebarCollapsed"

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest("input, textarea, select, [contenteditable='true']") !== null
  )
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [cursor, setCursor] = useState<MonthCursor>(() => monthCursorOf(new Date()))
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [panelOpen, setPanelOpen] = useState(() => localStorage.getItem(PANEL_KEY) !== "1")
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void window.dateloom.getTasks().then(setTasks)
    return window.dateloom.onTasksChanged(setTasks)
  }, [])

  const openAdd = useCallback((date: string, anchor: DOMRect) => {
    setPopover({ kind: "add", date, anchor })
  }, [])

  const openEdit = useCallback((taskId: string, date: string, anchor: DOMRect) => {
    setPopover({ kind: "edit", taskId, date, anchor })
  }, [])

  const openList = useCallback((date: string, anchor: DOMRect) => {
    setPopover({ kind: "list", date, anchor })
  }, [])

  const close = useCallback(() => setPopover(null), [])

  const togglePanel = useCallback(() => {
    setPanelOpen((open) => {
      const next = !open
      localStorage.setItem(PANEL_KEY, next ? "0" : "1")
      return next
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && popover) {
        event.preventDefault()
        close()
        return
      }
      if (popover) return
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
  }, [popover, close])

  useEffect(() => {
    if (!popover) return

    const handlePointerDown = (event: PointerEvent) => {
      if (popoverRef.current?.contains(event.target as Node)) return
      close()
    }

    window.addEventListener("pointerdown", handlePointerDown)
    return () => window.removeEventListener("pointerdown", handlePointerDown)
  }, [popover, close])

  useEffect(() => {
    if (popover?.kind === "edit" && !tasks.some((task) => task.id === popover.taskId)) {
      close()
    }
  }, [tasks, popover, close])

  const editedTask =
    popover?.kind === "edit" ? tasks.find((task) => task.id === popover.taskId) : undefined

  return (
    <div className="app">
      <MonthHeader
        cursor={cursor}
        panelOpen={panelOpen}
        onPrevious={() => setCursor((current) => addMonths(current, -1))}
        onNext={() => setCursor((current) => addMonths(current, 1))}
        onToday={() => setCursor(monthCursorOf(new Date()))}
        onTogglePanel={togglePanel}
      />

      <div className="shell">
        <MonthGrid
          cursor={cursor}
          tasks={tasks}
          onAdd={openAdd}
          onEdit={openEdit}
          onMore={openList}
        />
        {panelOpen && <SidePanel tasks={tasks} />}
      </div>

      {popover?.kind === "list" && (
        <DayListPopover
          date={popover.date}
          tasks={tasks}
          anchor={popover.anchor}
          containerRef={popoverRef}
          onEdit={(taskId) => openEdit(taskId, popover.date, popover.anchor)}
        />
      )}

      {popover?.kind === "add" && (
        <TaskEditorPopover
          mode="add"
          date={popover.date}
          occurrenceDate={popover.date}
          anchor={popover.anchor}
          containerRef={popoverRef}
          onClose={close}
        />
      )}

      {popover?.kind === "edit" && editedTask && (
        <TaskEditorPopover
          mode="edit"
          date={editedTask.date}
          occurrenceDate={popover.date}
          task={editedTask}
          anchor={popover.anchor}
          containerRef={popoverRef}
          onClose={close}
        />
      )}
    </div>
  )
}
