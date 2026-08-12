import { useCallback, useEffect, useState } from 'react'
import { getExpertTasks, RUNNING_TASK_CHANGED_EVENT, type ExpertTaskItem } from '../api/expertTasksApi'

const POLL_INTERVAL_MS = 20_000

export const getScheduledMinutes = (task: ExpertTaskItem | null) => {
  if (!task) return 0
  const [startHour, startMinute] = task.start_time.split(':').map(Number)
  const [endHour, endMinute] = task.end_time.split(':').map(Number)
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return 0

  const difference = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  return difference >= 0 ? difference : difference + 1440
}

export const getTaskStartTime = (task: ExpertTaskItem | null) => {
  if (!task?.task_start_time) return 0
  const value = task.task_start_time.trim()
  const parsed = new Date(`${value.replace(' ', 'T')}${/[zZ]|[+-]\d\d:\d\d$/.test(value) ? '' : 'Z'}`)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

export const useCurrentRunningTask = () => {
  const [runningTask, setRunningTask] = useState<ExpertTaskItem | null>(null)

  const refresh = useCallback(async () => {
    try {
      const tasks = await getExpertTasks({ activeOnly: true })
      setRunningTask(tasks.find((task) => task.is_own_task === 1 && task.status_name.trim().toLowerCase().includes('progress')) ?? null)
    } catch {
      // A silent refresh failure must not replace the last confirmed server state.
    }
  }, [])

  useEffect(() => {
    void refresh()
    const poll = window.setInterval(() => void refresh(), POLL_INTERVAL_MS)
    const handleTaskChange = () => void refresh()
    window.addEventListener(RUNNING_TASK_CHANGED_EVENT, handleTaskChange)
    return () => {
      window.clearInterval(poll)
      window.removeEventListener(RUNNING_TASK_CHANGED_EVENT, handleTaskChange)
    }
  }, [refresh])

  return runningTask
}
