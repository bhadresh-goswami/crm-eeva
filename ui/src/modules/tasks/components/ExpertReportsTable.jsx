import { BsArrowDownUp, BsEye, BsPlusCircle } from 'react-icons/bs'
import { formatEastern, formatIST, parseISTDateTime } from '../../../utils/timezone'

const statusBadge = (statusName) => {
  const n = String(statusName || '').toLowerCase()
  if (n === 'assigned') return 'bg-primary'
  if (n === 'completed') return 'bg-success'
  if (n === 'cancelled') return 'bg-secondary'
  if (n === 'pending') return 'bg-warning text-dark'
  return 'bg-secondary'
}

const ExpertReportsTable = ({ items, loading, sortBy, onSort, onAddFeedback, onViewFeedback }) => (
  <div className="card border-0 shadow-sm mb-2">
    <div className="card-body p-0">
      <div className="table-responsive w-100" style={{ maxWidth: '100%', overflowX: 'auto', overflowY: 'auto', maxHeight: '58vh' }}>
        <table className="table table-hover table-bordered align-middle mb-0" style={{ fontSize: '0.94rem', marginBottom: 0 }}>
          <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th className="text-center text-nowrap" style={{ minWidth: 92 }}>Action</th>
              {['task_date','expert_name','candidate_name','task_type','status_name','ist_time','est_time','duration'].map((col) => <th key={col} className="text-nowrap" role="button" onClick={() => onSort(col === 'ist_time' || col === 'est_time' ? 'task_date' : col)}>{col === 'ist_time' ? 'IST Time' : col === 'est_time' ? 'ET Time' : col.replaceAll('_',' ').replace(/\b\w/g, c => c.toUpperCase())} <BsArrowDownUp size={12} className={sortBy===col?'text-primary':''} /></th>)}
              <th className="text-nowrap" style={{ minWidth: 96 }}>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={10} className="text-center py-5"><div className="spinner-border text-primary" /></td></tr> : items.length===0 ? <tr><td colSpan={10} className="text-center py-5 text-muted">No completed tasks found.</td></tr> : items.map((row) => {
              const startDateTime = parseISTDateTime(row.task_date, row.start_time)
              const endDateTime = parseISTDateTime(row.task_date, row.end_time)
              const istTime = startDateTime ? `${formatIST(startDateTime)}${endDateTime ? ` - ${formatIST(endDateTime)}` : ''}` : '--'
              const estTime = startDateTime ? `${formatEastern(startDateTime)}${endDateTime ? ` - ${formatEastern(endDateTime)}` : ''}` : '--'
              const computedDuration = Number(row.duration) > 0 ? Number(row.duration) : (startDateTime && endDateTime ? Math.max(0, Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000)) : 0)
              return (
              <tr key={row.id}>
                <td className="text-center">{!row.has_feedback ? <button className="btn btn-primary btn-sm d-inline-flex align-items-center justify-content-center" style={{ width: 34, height: 30 }} onClick={() => onAddFeedback(row.id)} aria-label="Add Feedback" title="Add Feedback"><BsPlusCircle/></button> : <button className="btn btn-outline-success btn-sm d-inline-flex align-items-center justify-content-center" style={{ width: 34, height: 30 }} onClick={() => onViewFeedback(row.id)} aria-label="View Feedback" title="View Feedback"><BsEye/></button>}</td>
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
