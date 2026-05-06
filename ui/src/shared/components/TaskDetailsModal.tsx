import type { ReactNode } from 'react'
import AnimatedModal from './AnimatedModal'
import TaskCommentsPanel from './TaskCommentsPanel'

type TaskDetailRole = 'manager' | 'admin' | 'expert'

type TaskDetailData = {
  taskId: number
  title: string
  status: string
  candidateName: string
  candidateInfo?: string
  companyName?: string
  supportType?: string
  assignedTo?: string
  assignedBy?: string
  dueDate?: string
  startTime?: string
  endTime?: string
  description?: string
}

type TaskDetailsModalProps = {
  isOpen: boolean
  role: TaskDetailRole
  task: TaskDetailData | null
  onClose: () => void
  headerActions?: ReactNode
  commentsRefreshKey?: number
}

const toUtcFromIst = (dateValue: string, timeValue: string) => {
  const [y, m, d] = dateValue.split('-').map(Number)
  const [hh, mm, ss = 0] = timeValue.split(':').map(Number)
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, ss) - 330 * 60 * 1000
  return new Date(utcMs)
}

const formatDate = (dateValue: string, timeZone: 'Asia/Kolkata' | 'America/New_York' = 'Asia/Kolkata') => {
  const start = toUtcFromIst(dateValue, '00:00:00')
  if (!start) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone }).format(start)
}

const formatTimeRange = (dateValue: string, startTime: string, endTime: string, timeZone: 'Asia/Kolkata' | 'America/New_York') => {
  const start = toUtcFromIst(dateValue, startTime)
  const end = toUtcFromIst(dateValue, endTime)
  if (!start || !end) return '—'
  const formatter = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone })
  return `${formatter.format(start)} – ${formatter.format(end)}`
}

const badgeStyle = (status: string) => {
  const normalized = status.toLowerCase()
  if (normalized.includes('progress')) return { background: '#dcfce7', color: '#166534' }
  if (normalized.includes('cancel')) return { background: '#fed7aa', color: '#9a3412' }
  if (normalized.includes('show')) return { background: '#fef3c7', color: '#854d0e' }
  if (normalized.includes('reschedule')) return { background: '#4b5563', color: '#f9fafb' }
  if (normalized.includes('complete')) return { background: 'transparent', color: '#374151', border: '1px solid #d1d5db' }
  return { background: '#e5e7eb', color: '#374151' }
}

const TaskDetailsModal = ({ isOpen, role, task, onClose, headerActions, commentsRefreshKey = 0 }: TaskDetailsModalProps) => {
  if (!task) return null

  const statusBadge = badgeStyle(task.status)
  const showClientSection = role === 'manager' || role === 'admin'
  const description = (task.description ?? '').trim()
  const descriptionLooksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(description)
  const descriptionContainsTable = /<table[\s\S]*?>/i.test(description)

  const dateIst = task.dueDate ? formatDate(task.dueDate, 'Asia/Kolkata') : '—'
  const timeIst = task.dueDate && task.startTime && task.endTime ? formatTimeRange(task.dueDate, task.startTime, task.endTime, 'Asia/Kolkata') : '—'
  const dateEst = task.dueDate ? formatDate(task.dueDate, 'America/New_York') : '—'
  const timeEst = task.dueDate && task.startTime && task.endTime ? formatTimeRange(task.dueDate, task.startTime, task.endTime, 'America/New_York') : '—'

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} title="Task Details" cardClassName="task-details-modal-card task-details-modal-card--fullscreen" size="xl">
      <div className="task-details-modal">
        <div className="task-details-modal__header row g-2 align-items-center flex-nowrap">
          <div className="col">
            <h3 className="modal-title task-details-modal__title">{task.title || 'Task Details'}</h3>
          </div>
          <div className="col-auto">
            <div className="task-details-modal__header-actions">
            <span style={{ ...statusBadge, borderRadius: 999, padding: '0.22rem 0.7rem', fontWeight: 600, fontSize: 12 }}>{task.status || '—'}</span>
            {headerActions}
            <button type="button" className="button users-icon-btn" onClick={onClose} aria-label="Close task details">✕</button>
            </div>
          </div>
        </div>

        <div className="task-details-modal__body container-fluid">
          <section className="task-details-modal__section row g-3">
            <div className="col-12"><h4 className="task-details-modal__section-title">Candidate</h4></div>
            <div className="task-details-modal__grid col-12">
              <div className="task-details-modal__meta">
                <span className="task-details-modal__label">Candidate Name</span>
                <span className="task-details-modal__value">{task.candidateName || '—'}</span>
              </div>
              <div className="task-details-modal__meta">
                <span className="task-details-modal__label">Candidate Info</span>
                <span className="task-details-modal__value">{task.candidateInfo || '—'}</span>
              </div>
            </div>
          </section>

          {showClientSection ? (
            <section className="task-details-modal__section row g-3">
              <div className="col-12"><h4 className="task-details-modal__section-title">Client</h4></div>
              <div className="task-details-modal__meta col-12">
                <span className="task-details-modal__label">Company Name</span>
                <span className="task-details-modal__value">{task.companyName || '—'}</span>
              </div>
            </section>
          ) : null}

          <section className="task-details-modal__section row g-3">
            <div className="col-12"><h4 className="task-details-modal__section-title">Task Details</h4></div>
            <div className="task-details-modal__grid col-12">
              <div className="task-details-modal__meta"><span className="task-details-modal__label">Support Type</span><span className="task-details-modal__value">{task.supportType || '—'}</span></div>
              <div className="task-details-modal__meta"><span className="task-details-modal__label">Assigned To</span><span className="task-details-modal__value">{task.assignedTo || '—'}</span></div>
              <div className="task-details-modal__meta"><span className="task-details-modal__label">Assigned By</span><span className="task-details-modal__value">{task.assignedBy || '—'}</span></div>
              <div className="task-details-modal__meta"><span className="task-details-modal__label">Date (IST)</span><span className="task-details-modal__value">{dateIst}</span></div>
              <div className="task-details-modal__meta"><span className="task-details-modal__label">Time (IST)</span><span className="task-details-modal__value">{dateIst} | {timeIst}</span></div>
              <div className="task-details-modal__meta"><span className="task-details-modal__label">Time (EST)</span><span className="task-details-modal__value">{dateEst} | {timeEst}</span></div>
            </div>
          </section>

          <section className="task-details-modal__section row g-3 task-details-modal__description-section">
            <div className="col-12"><h4 className="task-details-modal__section-title">Task Description</h4></div>
            {!description ? <p className="task-details-modal__empty col-12">No description available</p> : null}
            {description && !descriptionLooksLikeHtml ? <p className="task-details-modal__description-text task-details-modal__description-scroll col-12">{description}</p> : null}
            {description && descriptionLooksLikeHtml ? (
              <div className={`task-details-modal__description-html task-details-modal__description-scroll col-12 ${descriptionContainsTable ? 'task-details-modal__description-html--table' : ''}`} dangerouslySetInnerHTML={{ __html: description }} />
            ) : null}
          </section>

          <TaskCommentsPanel taskId={task.taskId} refreshKey={commentsRefreshKey} />
        </div>
      </div>
    </AnimatedModal>
  )
}

export default TaskDetailsModal
