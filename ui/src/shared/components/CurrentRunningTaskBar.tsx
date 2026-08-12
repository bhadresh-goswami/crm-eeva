import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getScheduledMinutes, getTaskStartTime, useCurrentRunningTask } from '../../modules/tasks/hooks/useCurrentRunningTask'
import { formatEastern } from '../../utils/timezone'
import './CurrentRunningTaskBar.css'

const CurrentRunningTaskBar = () => {
  const navigate = useNavigate()
  const runningTask = useCurrentRunningTask()
  const [now, setNow] = useState(Date.now)
  const startAt = useMemo(() => getTaskStartTime(runningTask), [runningTask])

  useEffect(() => {
    setNow(Date.now())
    if (!runningTask) return
    const clock = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(clock)
  }, [runningTask])

  if (!runningTask) {
    return <section className="running-task-bar running-task-bar--empty" aria-label="Current running task"><strong>Current Running Task</strong><span aria-hidden="true">•</span><span>No task currently running</span></section>
  }

  const elapsedMinutes = startAt ? Math.max(0, Math.floor((now - startAt) / 60_000)) : 0
  const scheduledMinutes = getScheduledMinutes(runningTask)
  const exceededMinutes = scheduledMinutes > 0 ? Math.max(0, elapsedMinutes - scheduledMinutes) : 0
  const fields = [
    ['Candidate', runningTask.candidate_name || '—'],
    ['Task ID', `TAS-${runningTask.task_id}`],
    ['Task', runningTask.task_type || '—'],
    ['Started (ET)', startAt ? formatEastern(new Date(startAt)) : '—'],
    ['Duration', scheduledMinutes ? `${scheduledMinutes} min` : '—'],
    ['Elapsed', `${elapsedMinutes} min`],
    ['Status', runningTask.status_name || 'In Progress'],
  ]

  return (
    <section className="running-task-bar" aria-label="Current running task">
      <header><strong>Current Running Task</strong><span className="running-task-bar__live"><i /> LIVE</span></header>
      <div className="running-task-bar__fields">{fields.map(([label, value]) => <dl key={label}><dt>{label}</dt><dd>{value}</dd></dl>)}</div>
      <footer>
        {exceededMinutes > 0 ? <span className="running-task-bar__warning" role="status">⚠ Task duration exceeded by {exceededMinutes} minutes</span> : <span />}
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => navigate('/tasks')}>Manage Task →</button>
      </footer>
    </section>
  )
}

export default CurrentRunningTaskBar
