import { BsArrowDownUp, BsChatSquareText, BsEye } from 'react-icons/bs'
import { formatEST, formatIST } from '../../../utils/timezone'

type Row = {
  id: number
  task_date: string
  candidate_name: string
  task_type: string
  expert_name?: string
  status_name: string
  start_time?: string
  end_time?: string
  duration: number
  has_feedback: boolean
  feedback_id: number | null
}


const parseISTDateTime = (dateValue?: string, timeValue?: string) => {
  if (!dateValue || !timeValue) return null
  const timePart = String(timeValue).trim().slice(0, 8)
  const normalizedDate = String(dateValue).trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizedDate)
  if (!match) return null
  const [h, m, s = '00'] = timePart.split(':')
  if (!h || !m) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hours = Number(h)
  const minutes = Number(m)
  const seconds = Number(s)
  if ([year, month, day, hours, minutes, seconds].some(Number.isNaN)) return null

  const utcMillis = Date.UTC(year, month - 1, day, hours - 5, minutes - 30, seconds)
  const asDate = new Date(utcMillis)
  return Number.isNaN(asDate.getTime()) ? null : asDate
}


type Props = {
  items: Row[]
  loading: boolean
  sortBy: string
  sortOrder: string
  onSort: (column: string) => void
  onAddFeedback: (id: number) => void
  onViewFeedback: (id: number) => void
}

const statusBadge = (statusName: string) => {
  const n = String(statusName || '').toLowerCase()
  if (n === 'assigned') return 'bg-primary'
  if (n === 'completed') return 'bg-success'
  if (n === 'cancelled') return 'bg-secondary'
  if (n === 'pending') return 'bg-warning text-dark'
  return 'bg-secondary'
}

const actionCellStyle = {
  width: 80,
  minWidth: 80,
}

const actionButtonBaseStyle = {
  width: 36,
  height: 36,
  borderRadius: '999px',
  border: 'none',
  color: '#fff',
  boxShadow: '0 4px 10px rgba(15, 23, 42, 0.16)',
  transition: 'all 0.18s ease',
}

const ExpertReportsTable = ({ items, loading, sortBy, onSort, onAddFeedback, onViewFeedback }: Props) => (
  <div className="card border-0 shadow-sm mb-2">
    <div className="card-body p-0">
      <div className="table-responsive w-100" style={{ maxWidth: '100%', overflowX: 'auto', overflowY: 'auto', maxHeight: '58vh' }}>
        <table className="table table-hover table-bordered align-middle mb-0" style={{ fontSize: '0.94rem', marginBottom: 0 }}>
          <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th className="text-center text-nowrap" style={actionCellStyle}>Action</th>
              {['task_date','expert_name','candidate_name','task_type','status_name','ist_time','est_time','duration'].map((col) => <th key={col} className="text-nowrap" role="button" onClick={() => onSort(col === 'ist_time' || col === 'est_time' ? 'task_date' : col)}>{col === 'ist_time' ? 'IST Time' : col === 'est_time' ? 'EST Time' : col.replaceAll('_',' ').replace(/\b\w/g, (c) => c.toUpperCase())} <BsArrowDownUp size={12} className={sortBy===col?'text-primary':''} /></th>)}
              <th className="text-nowrap" style={{ minWidth: 96 }}>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={10} className="text-center py-5"><div className="spinner-border text-primary" /></td></tr> : items.length===0 ? <tr><td colSpan={10} className="text-center py-5 text-muted">No completed tasks found.</td></tr> : items.map((row) => {
              const startDateTime = parseISTDateTime(row.task_date, row.start_time)
              const endDateTime = parseISTDateTime(row.task_date, row.end_time)
              const istTime = startDateTime
                ? `${formatIST(startDateTime)}${endDateTime ? ` - ${formatIST(endDateTime)}` : ''}`
                : '--'
              const estTime = startDateTime
                ? `${formatEST(startDateTime)}${endDateTime ? ` - ${formatEST(endDateTime)}` : ''}`
                : '--'
              const computedDuration = Number(row.duration) > 0
                ? Number(row.duration)
                : (startDateTime && endDateTime ? Math.max(0, Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000)) : 0)
              return (
              <tr key={row.id}>
                <td style={actionCellStyle}>
                  <div className="d-flex justify-content-center align-items-center">
                    {!row.has_feedback ? (
                      <button
                        type="button"
                        className="btn btn-sm d-inline-flex align-items-center justify-content-center"
                        style={{ ...actionButtonBaseStyle, backgroundColor: '#2563EB' }}
                        onClick={() => onAddFeedback(row.id)}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.backgroundColor = '#1D4ED8'
                          event.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.backgroundColor = '#2563EB'
                          event.currentTarget.style.transform = 'translateY(0)'
                        }}
                        aria-label="Add Feedback"
                        title="Add Feedback"
                      >
                        <BsChatSquareText size={17} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm d-inline-flex align-items-center justify-content-center"
                        style={{ ...actionButtonBaseStyle, backgroundColor: '#059669' }}
                        onClick={() => onViewFeedback(row.id)}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.backgroundColor = '#047857'
                          event.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.backgroundColor = '#059669'
                          event.currentTarget.style.transform = 'translateY(0)'
                        }}
                        aria-label="View Feedback"
                        title="View Feedback"
                      >
                        <BsEye size={17} />
                      </button>
                    )}
                  </div>
                </td>
                <td className="text-nowrap">{row.task_date || '--'}</td><td className="text-nowrap">{row.expert_name || '--'}</td><td className="text-nowrap">{row.candidate_name || '--'}</td><td className="text-nowrap">{row.task_type || '--'}</td>
                <td className="text-nowrap"><span className={`badge ${statusBadge(row.status_name)}`}>{row.status_name || '--'}</span></td>
                <td className="text-nowrap">{istTime}</td>
                <td className="text-nowrap">{estTime}</td>
                <td className="text-nowrap">{computedDuration > 0 ? `${computedDuration} min` : '--'}</td>
                <td className="text-nowrap align-middle">
                  {row.feedback_id == null ? (
                    <span className="badge bg-warning text-dark">Pending</span>
                  ) : (
                    <span className="badge bg-success">Submitted</span>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)

export default ExpertReportsTable
