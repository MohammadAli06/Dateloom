import { useEffect, useState } from "react"
import { toDateKey } from "../../../shared/dates"

export function useToday(): string {
  const [today, setToday] = useState(() => toDateKey(new Date()))
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      clearTimeout(timer)
      const now = new Date()
      setToday(toDateKey(now))
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 50)
    }
    refresh()
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [])
  return today
}
