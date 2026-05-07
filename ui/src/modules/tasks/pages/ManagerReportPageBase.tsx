import { useMemo, useState } from 'react'
import { BsArrowDownUp, BsEye } from 'react-icons/bs'

export type ReportColumn = { key: string; label: string }

type ReportPageProps = {
  title: string
  columns: ReportColumn[]
}

type SortConfig = { key: string; direction: 'asc' | 'desc' }

const seedRows = [
  {
    taskId: 'TSK-1044',
    candidate: 'Ava Thompson',
    technicalExpert: 'Noah Carter',
    taskType: 'L1 Interview',
    clientCompany: 'Apex Systems',
    status: 'Pending Feedback',
    dueDate: '2026-05-09',
    date: '2026-05-06',
    estTime: '10:00 AM',
    duration: '45 min',
    feedbackStatus: 'Pending',
    averageScore: '—',
    feedbackSubmittedDate: '—',
  },
  {
    taskId: 'TSK-1045',
    candidate: 'Liam Patel',
    technicalExpert: 'Emma Garcia',
    taskType: 'Technical Screening',
    clientCompany: 'Nimble Labs',
    status: 'Completed',
    dueDate: '2026-05-10',
    date: '2026-05-05',
    estTime: '01:30 PM',
    duration: '60 min',
    feedbackStatus: 'Submitted',
    averageScore: '4.3',
    feedbackSubmittedDate: '2026-05-05',
  },
  {
    taskId: 'TSK-1046',
    candidate: 'Sophia Nguyen',
    technicalExpert: 'Ethan Brooks',
    taskType: 'Final Round',
    clientCompany: 'Vertex Cloud',
    status: 'In Review',
    dueDate: '2026-05-11',
    date: '2026-05-04',
    estTime: '04:00 PM',
    duration: '50 min',
    feedbackStatus: 'In Progress',
    averageScore: '3.9',
    feedbackSubmittedDate: '2026-05-04',
  },
]

const ManagerReportPageBase = ({ title, columns }: ReportPageProps) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'taskId', direction: 'asc' })
  const [selectedRow, setSelectedRow] = useState<(typeof seedRows)[number] | null>(null)

  const sortedRows = useMemo(() => {
    return [...seedRows].sort((a, b) => {
      const valueA = String((a as Record<string, string>)[sortConfig.key] ?? '')
      const valueB = String((b as Record<string, string>)[sortConfig.key] ?? '')
      const compare = valueA.localeCompare(valueB, undefined, { numeric: true })
      return sortConfig.direction === 'asc' ? compare : -compare
    })
  }, [sortConfig])

  const onSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  return (
    <div className="page-container">
      <div className="page-container__header">
        <div>
          <h1 className="page-title mb-1">{title}</h1>
          <p className="page-description mb-0">Manager reporting view for operational tracking (dummy data for UI only).</p>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title mb-3">Filters</h3>
        <div className="row g-2 g-md-3">
          {['Candidate', 'Technical Expert', 'Task Type', 'Client Company', 'Status'].map((field) => (
            <div key={field} className="col-12 col-sm-6 col-lg-3">
              <label className="form-label">{field}</label>
              <select className="form-select">
                <option>All {field}</option>
              </select>
            </div>
          ))}
          <div className="col-12 col-sm-6 col-lg-3">
            <label className="form-label">From Date</label>
            <input type="date" className="form-control" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <label className="form-label">To Date</label>
            <input type="date" className="form-control" />
          </div>
          <div className="col-12 d-flex gap-2 justify-content-end mt-2">
            <button className="btn btn-primary btn-sm" type="button">Apply Filter</button>
            <button className="btn btn-outline-secondary btn-sm" type="button">Reset</button>
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-wrapper manager-reports-table__wrapper">
          <table className="table table-hover table-bordered align-middle manager-reports-table mb-0">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>
                    <button type="button" className="manager-sort" onClick={() => onSort(column.key)}>
                      <span>{column.label}</span>
                      <BsArrowDownUp size={12} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.taskId}>
                  {columns.map((column) => {
                    if (column.key === 'action') {
                      return (
                        <td key={`${row.taskId}-${column.key}`} className="text-center">
                          <button
                            className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                            title="View Details"
                            aria-label="View Details"
                            onClick={() => setSelectedRow(row)}
                            style={{ width: 34, height: 30 }}
                            type="button"
                          >
                            <BsEye size={15} />
                          </button>
                        </td>
                      )
                    }
                    return (
                      <td key={`${row.taskId}-${column.key}`} title={String((row as Record<string, string>)[column.key] ?? '—')}>
                        <span className="manager-cell-ellipsis">{String((row as Record<string, string>)[column.key] ?? '—')}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card py-2 px-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
        <small className="text-muted">Showing 1 to 3 of 3 entries</small>
        <nav>
          <ul className="pagination mb-0">
            <li className="page-item disabled"><button className="page-link">Previous</button></li>
            <li className="page-item active"><button className="page-link">1</button></li>
            <li className="page-item disabled"><button className="page-link">Next</button></li>
          </ul>
        </nav>
      </div>

      <div className={`modal fade ${selectedRow ? 'show d-block' : ''}`} tabIndex={-1} role="dialog" aria-modal={selectedRow ? 'true' : 'false'}>
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Task Details: {selectedRow?.taskId}</h5>
              <button type="button" className="btn-close" onClick={() => setSelectedRow(null)} aria-label="Close" />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-12 col-lg-6"><div className="card h-100"><h6>Candidate Details</h6><p className="mb-1"><strong>Name:</strong> {selectedRow?.candidate}</p><p className="mb-0"><strong>Client:</strong> {selectedRow?.clientCompany}</p></div></div>
                <div className="col-12 col-lg-6"><div className="card h-100"><h6>Task Details</h6><p className="mb-1"><strong>Type:</strong> {selectedRow?.taskType}</p><p className="mb-0"><strong>Expert:</strong> {selectedRow?.technicalExpert}</p></div></div>
                <div className="col-12"><div className="card"><h6>Initial Comment</h6><p className="mb-0">Candidate demonstrated strong communication and baseline technical confidence.</p></div></div>
                <div className="col-12"><div className="card"><h6>Detailed Feedback</h6><p className="mb-0">Dummy placeholder for manager review summary, strengths, concerns, and hiring recommendation notes.</p></div></div>
              </div>
            </div>
            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setSelectedRow(null)}>Close</button></div>
          </div>
        </div>
      </div>
      {selectedRow ? <div className="modal-backdrop fade show" /> : null}
    </div>
  )
}

export default ManagerReportPageBase
