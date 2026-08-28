// import { useMemo, useState } from 'react'

// type DailyRow = {
//   work_date: string
//   total_minutes: number
//   total_tasks: number
//   interview_support: number
//   mock_interview: number
//   resume_support: number
//   linkedin_support: number
//   other_tasks: number
//   completed_tasks: number
//   success_tasks: number
//   rejected_tasks: number
//   productivity: number
//   status: string
// }

// type DailySummary = {
//   average_minutes?: number
//   total_minutes?: number
//   total_tasks?: number
//   productivity?: number
// }

// type DailyWorkingAnalyticsData = {
//   summary?: DailySummary
//   rows?: DailyRow[]
// }

// type DailyWorkingAnalyticsTableProps = {
//   data?: DailyWorkingAnalyticsData
//   loading?: boolean
//   onRecalculateDuration?: () => void
//   recalculatingDuration?: boolean
// }

// export const formatMinutesToHours = (minutes: number) => {
//   const total = Number(minutes || 0)
//   const hrs = Math.floor(total / 60)
//   const mins = total % 60

//   if (hrs <= 0) return `${mins} min`
//   if (mins <= 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`

//   return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min`
// }

// const statusBadgeClass = (status: string) => {
//   if (status === 'Excellent') return 'bg-success-subtle text-success-emphasis'
//   if (status === 'Good') return 'bg-primary-subtle text-primary-emphasis'
//   return 'bg-danger-subtle text-danger-emphasis'
// }

// const DailyWorkingAnalyticsTable = ({
//   data = { summary: {}, rows: [] },
//   loading = false,
//   onRecalculateDuration,
//   recalculatingDuration = false,
// }: DailyWorkingAnalyticsTableProps) => {
//   const [search, setSearch] = useState('')
//   const [page, setPage] = useState(1)
//   const [pageSize, setPageSize] = useState(5)

//   const filteredRows = useMemo(() => {
//     const q = search.trim().toLowerCase()
//     if (!q) return data.rows ?? []
//     return (data.rows ?? []).filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(q)))
//   }, [data.rows, search])

//   const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
//   const safePage = Math.min(page, totalPages)
//   const paginatedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)

//   return (<div className="card expert-dashboard__analytics"><div className="card-body"><div className="expert-dashboard__section-head"><div><h5>Daily Working Hours Analytics</h5><p>Last 30 days work tracking and task productivity insights.</p></div><div className="expert-dashboard__analytics-tools"><button type="button" className="btn btn-outline-primary btn-sm" onClick={onRecalculateDuration} disabled={loading || recalculatingDuration || !onRecalculateDuration}>{recalculatingDuration ? 'Recalculating...' : 'Recalculate Duration'}</button><input className="form-control form-control-sm" placeholder="Search by date..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div></div>

//     <div className="row g-2 mb-3"><div className="col-6 col-lg-3"><div className="border rounded-3 p-2"><small className="text-muted d-block">Average Hours</small><strong>{formatMinutesToHours(data.summary?.average_minutes ?? 0)}</strong></div></div><div className="col-6 col-lg-3"><div className="border rounded-3 p-2"><small className="text-muted d-block">Total Hours</small><strong>{formatMinutesToHours(data.summary?.total_minutes ?? 0)}</strong></div></div><div className="col-6 col-lg-3"><div className="border rounded-3 p-2"><small className="text-muted d-block">Total Tasks</small><strong>{data.summary?.total_tasks ?? 0}</strong></div></div><div className="col-6 col-lg-3"><div className="border rounded-3 p-2"><small className="text-muted d-block">Productivity Avg %</small><strong>{data.summary?.productivity ?? 0}%</strong></div></div></div>

//     <div className="table-responsive expert-dashboard__table-scroll"><table className="table table-hover align-middle mb-0"><thead className="table-light"><tr>{['Date', 'Working Hours', 'Total Tasks', 'Interview Support', 'Mock Interview', 'Resume Support', 'LinkedIn Support', 'Other Tasks', 'Completed', 'Success', 'Rejected', 'Productivity %', 'Status'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={13} className="text-center py-4">Loading...</td></tr> : paginatedRows.length === 0 ? <tr><td colSpan={13} className="text-center py-4">No data available</td></tr> : paginatedRows.map((row) => (<tr key={row.work_date}><td>{row.work_date}</td><td>{formatMinutesToHours(row.total_minutes)}</td><td>{row.total_tasks}</td><td>{row.interview_support}</td><td>{row.mock_interview}</td><td>{row.resume_support}</td><td>{row.linkedin_support}</td><td>{row.other_tasks}</td><td>{row.completed_tasks}</td><td>{row.success_tasks}</td><td>{row.rejected_tasks}</td><td>{row.productivity}%</td><td><span className={`badge ${statusBadgeClass(row.status)}`}>{row.status}</span></td></tr>))}</tbody></table></div>

//     <div className="expert-dashboard__pagination"><span>Showing {filteredRows.length ? (safePage - 1) * pageSize + 1 : 0} to {Math.min(safePage * pageSize, filteredRows.length)} of {filteredRows.length} records</span><label>Rows per page <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>{[5, 10, 20, 50, 100].map((size) => <option key={size}>{size}</option>)}</select></label><button className="btn btn-sm btn-outline-secondary" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>{Array.from({ length: Math.min(totalPages, 4) }, (_, index) => index + 1).map((number) => <button className={`btn btn-sm ${safePage === number ? 'btn-primary' : 'btn-outline-secondary'}`} key={number} onClick={() => setPage(number)}>{number}</button>)}<button className="btn btn-sm btn-outline-secondary" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>›</button></div>
//   </div></div>)
// }

// export default DailyWorkingAnalyticsTable


import { useEffect, useMemo, useState } from 'react'

type DailyRow = {
  work_date: string
  total_minutes: number
  total_tasks: number
  interview_support: number
  mock_interview: number
  resume_support: number
  linkedin_support: number
  other_tasks: number
  completed_tasks: number
  success_tasks: number
  rejected_tasks: number
  productivity: number
  status: string
}

type DailySummary = {
  average_minutes?: number
  total_minutes?: number
  total_tasks?: number
  productivity?: number
}

type DailyWorkingAnalyticsData = {
  summary?: DailySummary
  rows?: DailyRow[]
}

type DailyWorkingAnalyticsTableProps = {
  data?: DailyWorkingAnalyticsData
  loading?: boolean
  onRecalculateDuration?: () => void
  recalculatingDuration?: boolean
}

export const formatMinutesToHours = (minutes: number) => {
  const parsed = Number(minutes)
  const total = Number.isFinite(parsed) ? Math.max(0, parsed) : 0

  const hrs = Math.floor(total / 60)
  const mins = Math.floor(total % 60)

  if (hrs <= 0) return `${mins} min`
  if (mins <= 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`

  return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min`
}

const statusBadgeClass = (status: string) => {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized === 'excellent') {
    return 'bg-success-subtle text-success-emphasis'
  }

  if (normalized === 'good') {
    return 'bg-primary-subtle text-primary-emphasis'
  }

  if (normalized === 'medium') {
    return 'bg-warning-subtle text-warning-emphasis'
  }

  if (normalized === 'low') {
    return 'bg-danger-subtle text-danger-emphasis'
  }

  return 'bg-secondary-subtle text-secondary-emphasis'
}

const DailyWorkingAnalyticsTable = ({
  data = { summary: {}, rows: [] },
  loading = false,
  onRecalculateDuration,
  recalculatingDuration = false,
}: DailyWorkingAnalyticsTableProps) => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const rows = data.rows ?? []

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return rows
    }

    return rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(query),
      ),
    )
  }, [rows, search])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / pageSize),
  )

  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    const end = safePage * pageSize

    return filteredRows.slice(start, end)
  }, [filteredRows, safePage, pageSize])

  const visiblePages = useMemo(() => {
    if (totalPages <= 4) {
      return Array.from(
        { length: totalPages },
        (_, index) => index + 1,
      )
    }

    if (safePage <= 2) {
      return [1, 2, 3, 4]
    }

    if (safePage >= totalPages - 1) {
      return [
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ]
    }

    return [
      safePage - 1,
      safePage,
      safePage + 1,
      safePage + 2,
    ]
  }, [safePage, totalPages])

  const showingFrom =
    filteredRows.length === 0
      ? 0
      : (safePage - 1) * pageSize + 1

  const showingTo = Math.min(
    safePage * pageSize,
    filteredRows.length,
  )

  return (
    <div className="card expert-dashboard__analytics">
      <div className="card-body">
        <div className="expert-dashboard__section-head">
          <div>
            <h5 className="mb-1">
              Daily Working Hours Analytics
            </h5>

            <p className="mb-0 text-muted">
              Last 30 days work tracking and task productivity insights.
            </p>
          </div>

          <div className="expert-dashboard__analytics-tools">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={onRecalculateDuration}
              disabled={
                loading ||
                recalculatingDuration ||
                !onRecalculateDuration
              }
            >
              {recalculatingDuration
                ? 'Recalculating...'
                : 'Recalculate Duration'}
            </button>

            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search by date..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>

        <div className="row g-2 mb-3">
          <div className="col-6 col-lg-3">
            <div className="border rounded-3 p-2 h-100">
              <small className="text-muted d-block">
                Average Hours
              </small>

              <strong>
                {formatMinutesToHours(
                  data.summary?.average_minutes ?? 0,
                )}
              </strong>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="border rounded-3 p-2 h-100">
              <small className="text-muted d-block">
                Total Hours
              </small>

              <strong>
                {formatMinutesToHours(
                  data.summary?.total_minutes ?? 0,
                )}
              </strong>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="border rounded-3 p-2 h-100">
              <small className="text-muted d-block">
                Total Tasks
              </small>

              <strong>
                {data.summary?.total_tasks ?? 0}
              </strong>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="border rounded-3 p-2 h-100">
              <small className="text-muted d-block">
                Productivity Avg %
              </small>

              <strong>
                {Number(
                  data.summary?.productivity ?? 0,
                ).toFixed(2)}
                %
              </strong>
            </div>
          </div>
        </div>

        <div className="table-responsive expert-dashboard__table-scroll">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                {[
                  'Date',
                  'Working Hours',
                  'Total Tasks',
                  'Interview Support',
                  'Mock Interview',
                  'Resume Support',
                  'LinkedIn Support',
                  'Other Tasks',
                  'Completed',
                  'Success',
                  'Rejected',
                  'Productivity %',
                  'Status',
                ].map((heading) => (
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={13}
                    className="text-center py-4"
                  >
                    Loading...
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="text-center py-4 text-muted"
                  >
                    No data available
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.work_date}>
                    <td>{row.work_date}</td>

                    <td>
                      {formatMinutesToHours(
                        row.total_minutes,
                      )}
                    </td>

                    <td>{row.total_tasks}</td>
                    <td>{row.interview_support}</td>
                    <td>{row.mock_interview}</td>
                    <td>{row.resume_support}</td>
                    <td>{row.linkedin_support}</td>
                    <td>{row.other_tasks}</td>
                    <td>{row.completed_tasks}</td>
                    <td>{row.success_tasks}</td>
                    <td>{row.rejected_tasks}</td>

                    <td>
                      {Number(
                        row.productivity ?? 0,
                      ).toFixed(2)}
                      %
                    </td>

                    <td>
                      <span
                        className={`badge ${statusBadgeClass(
                          row.status,
                        )}`}
                      >
                        {row.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="expert-dashboard__pagination">
          <span>
            Showing {showingFrom} to {showingTo} of{' '}
            {filteredRows.length} records
          </span>

          <label>
            Rows per page{' '}
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(
                  Number(event.target.value),
                )
                setPage(1)
              }}
            >
              {[5, 10, 20, 50, 100].map((size) => (
                <option
                  key={size}
                  value={size}
                >
                  {size}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={safePage <= 1}
            onClick={() =>
              setPage((currentPage) =>
                Math.max(1, currentPage - 1),
              )
            }
          >
            ‹
          </button>

          {visiblePages.map((number) => (
            <button
              type="button"
              key={number}
              className={`btn btn-sm ${
                safePage === number
                  ? 'btn-primary'
                  : 'btn-outline-secondary'
              }`}
              onClick={() => setPage(number)}
            >
              {number}
            </button>
          ))}

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={safePage >= totalPages}
            onClick={() =>
              setPage((currentPage) =>
                Math.min(
                  totalPages,
                  currentPage + 1,
                ),
              )
            }
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}

export default DailyWorkingAnalyticsTable