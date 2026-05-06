import { BsArrowDownUp, BsEye, BsPlusCircle } from 'react-icons/bs'

const statusBadge = (statusName) => {
  const n = String(statusName || '').toLowerCase()
  if (n === 'assigned') return 'bg-primary'
  if (n === 'completed') return 'bg-success'
  if (n === 'cancelled') return 'bg-secondary'
  if (n === 'pending') return 'bg-warning text-dark'
  return 'bg-secondary'
}

const ExpertReportsTable = ({ items, loading, sortBy, sortOrder, onSort, onAddFeedback, onViewFeedback }) => (
  <div className="card shadow-sm">
    <div className="card-body p-3">
      <div className="table-responsive">
        <table className="table table-hover table-bordered align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th className="text-center text-nowrap" style={{ minWidth: 160 }}>Action</th>
              {['task_date','candidate_name','task_type','status_name','duration'].map((col) => <th key={col} role="button" onClick={() => onSort(col)}>{col.replaceAll('_',' ').replace(/\b\w/g, c => c.toUpperCase())} <BsArrowDownUp size={12} className={sortBy===col?'text-primary':''} /></th>)}
              <th className="text-nowrap" style={{ minWidth: 190 }}>EST Time</th>
              <th className="text-nowrap" style={{ minWidth: 110 }}>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="text-center py-5"><div className="spinner-border text-primary" /></td></tr> : items.length===0 ? <tr><td colSpan={8} className="text-center py-5 text-muted">No completed tasks found.</td></tr> : items.map((row) => (
              <tr key={row.id}>
                <td className="text-center">{!row.has_feedback ? <button className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2" onClick={() => onAddFeedback(row.id)}><BsPlusCircle/>Add Feedback</button> : <button className="btn btn-outline-success btn-sm d-inline-flex align-items-center gap-2" onClick={() => onViewFeedback(row.id)}><BsEye/>View Feedback</button>}</td>
                <td>{row.task_date || '--'}</td><td>{row.candidate_name || '--'}</td><td>{row.task_type || '--'}</td>
                <td><span className={`badge ${statusBadge(row.status_name)}`}>{row.status_name || '--'}</span></td>
                <td className="text-nowrap">{row.est_time_range || '--'}</td>
                <td className="text-nowrap">{row.duration ? `${row.duration} min` : '--'}</td>
                <td>{row.has_feedback ? 'Submitted' : 'Pending'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)

export default ExpertReportsTable
