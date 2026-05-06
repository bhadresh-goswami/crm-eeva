import { BsArrowDownUp, BsEye, BsPlusCircle } from 'react-icons/bs'

type Row = {
  id: number
  task_date: string
  candidate_name: string
  task_type: string
  status_name: string
  est_time_range: string
  duration: number
  has_feedback: boolean
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

const ExpertReportsTable = ({ items, loading, sortBy, onSort, onAddFeedback, onViewFeedback }: Props) => (
  <div className="card shadow-sm">
    <div className="card-body p-3">
      <div className="table-responsive">
        <table className="table table-hover table-bordered align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th className="text-center text-nowrap" style={{ minWidth: 160 }}>Action</th>
              {['task_date','candidate_name','task_type','status_name','est_time','duration'].map((col) => <th key={col} className="text-nowrap" role="button" onClick={() => onSort(col === 'est_time' ? 'task_date' : col)}>{col.replaceAll('_',' ').replace(/\b\w/g, (c) => c.toUpperCase())} <BsArrowDownUp size={12} className={sortBy===col?'text-primary':''} /></th>)}
              <th className="text-nowrap" style={{ minWidth: 110 }}>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="text-center py-5"><div className="spinner-border text-primary" /></td></tr> : items.length===0 ? <tr><td colSpan={8} className="text-center py-5 text-muted">No completed tasks found.</td></tr> : items.map((row) => (
              <tr key={row.id}>
                <td className="text-center">{!row.has_feedback ? <button className="btn btn-primary btn-sm d-inline-flex align-items-center justify-content-center" style={{ width: 36, height: 32 }} onClick={() => onAddFeedback(row.id)} aria-label="Add Feedback" title="Add Feedback"><BsPlusCircle/></button> : <button className="btn btn-outline-success btn-sm d-inline-flex align-items-center justify-content-center" style={{ width: 36, height: 32 }} onClick={() => onViewFeedback(row.id)} aria-label="View Feedback" title="View Feedback"><BsEye/></button>}</td>
                <td className="text-nowrap">{row.task_date || '--'}</td><td className="text-nowrap">{row.candidate_name || '--'}</td><td className="text-nowrap">{row.task_type || '--'}</td>
                <td className="text-nowrap"><span className={`badge ${statusBadge(row.status_name)}`}>{row.status_name || '--'}</span></td>
                <td className="text-nowrap">{row.est_time_range || '--'}</td>
                <td className="text-nowrap">{row.duration ? `${row.duration} min` : '--'}</td>
                <td className="text-nowrap">{row.has_feedback ? 'Submitted' : 'Pending'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)

export default ExpertReportsTable
