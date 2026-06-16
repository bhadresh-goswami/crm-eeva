import { useEffect, useMemo, useState } from 'react'
import { BsArrowDownUp, BsDownload } from 'react-icons/bs'
import PageContainer from '../../../shared/components/PageContainer'
import ManagerWorkspaceHeader from '../../../shared/components/ManagerWorkspaceHeader'
import { useAuth } from '../../../context/AuthContext'
import { getManagerTasksByStatus, type DashboardTask, type ManagerTaskStatus } from '../../dashboard/api/dashboardApi'

type WorkloadCounts = {
  coordinatorName: string
  assignedTasks: number
  pendingTasks: number
  inProgressTasks: number
  completedTasks: number
  overdueTasks: number
  totalActiveTasks: number
}

type WorkloadHealth = {
  label: 'Good' | 'Moderate' | 'Under Utilized'
  className: string
}

type WorkloadRow = WorkloadCounts & {
  workloadPercentage: number
  workloadHealth: WorkloadHealth
}

type SortKey = keyof WorkloadCounts | 'workloadPercentage'

type SortState = {
  key: SortKey
  direction: 'asc' | 'desc'
}

const statuses: ManagerTaskStatus[] = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled']
const pageSizes = [10, 25, 50, 100]
const isOverdueTask = (task: DashboardTask) => {
  const normalizedStatus = task.status.toLowerCase().trim()
  if (!task.dueDate || ['completed', 'cancelled'].includes(normalizedStatus)) return false
  const due = new Date(task.dueDate.slice(0, 10))
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return due < today
}

const csvEscape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`

const getWorkloadHealth = (percentage: number): WorkloadHealth => {
  if (percentage >= 70) return { label: 'Good', className: 'bg-success-subtle text-success' }
  if (percentage >= 40) return { label: 'Moderate', className: 'bg-warning-subtle text-warning' }
  return { label: 'Under Utilized', className: 'bg-danger-subtle text-danger' }
}

const getWorkloadPercentage = (activeTasks: number, highestActiveTasks: number) => {
  if (highestActiveTasks <= 0) return 0
  return Math.round((activeTasks / highestActiveTasks) * 100)
}

const TeamWorkloadReport = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<DashboardTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [coordinator, setCoordinator] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<SortState>({ key: 'coordinatorName', direction: 'asc' })

  const loadReport = async () => {
    try {
      setLoading(true)
      setError(null)
      const grouped = await Promise.all(statuses.map((status) => getManagerTasksByStatus(status)))
      const unique = Array.from(new Map(grouped.flat().map((task) => [task.id, task])).values())
      setTasks(unique)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load team workload report.')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadReport()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, coordinator, fromDate, toDate, pageSize])

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const taskDate = task.dueDate?.slice(0, 10) || ''
    if (fromDate && taskDate < fromDate) return false
    if (toDate && taskDate > toDate) return false
    const owner = task.assignedToName?.trim() || 'Unassigned'
    if (coordinator !== 'all' && owner !== coordinator) return false
    return true
  }), [coordinator, fromDate, tasks, toDate])

  const coordinatorOptions = useMemo(() => {
    const names = new Set(tasks.map((task) => task.assignedToName?.trim() || 'Unassigned'))
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [tasks])

  const workloadCounts = useMemo(() => {
    const map = new Map<string, WorkloadCounts>()

    filteredTasks.forEach((task) => {
      const name = task.assignedToName?.trim() || 'Unassigned'
      const row = map.get(name) ?? {
        coordinatorName: name,
        assignedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        totalActiveTasks: 0,
      }

      const normalizedStatus = task.status.toLowerCase().trim()
      if (normalizedStatus === 'assigned') row.assignedTasks += 1
      if (normalizedStatus === 'pending') row.pendingTasks += 1
      if (normalizedStatus === 'in progress' || normalizedStatus === 'in_progress') row.inProgressTasks += 1
      if (normalizedStatus === 'completed') row.completedTasks += 1
      if (isOverdueTask(task)) row.overdueTasks += 1
      row.totalActiveTasks = row.assignedTasks + row.pendingTasks + row.inProgressTasks + row.overdueTasks
      map.set(name, row)
    })

    return Array.from(map.values())
  }, [filteredTasks])

  const visibleRows = useMemo<WorkloadRow[]>(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const filteredRows = workloadCounts.filter((row) => !normalizedSearch || row.coordinatorName.toLowerCase().includes(normalizedSearch))
    const highestActiveTasks = Math.max(0, ...filteredRows.map((row) => row.totalActiveTasks))

    return filteredRows.map((row) => {
      const workloadPercentage = getWorkloadPercentage(row.totalActiveTasks, highestActiveTasks)
      return {
        ...row,
        workloadPercentage,
        workloadHealth: getWorkloadHealth(workloadPercentage),
      }
    })
  }, [workloadCounts, search])

  const sortedRows = useMemo(() => [...visibleRows].sort((a, b) => {
    const aValue = a[sort.key]
    const bValue = b[sort.key]
    const direction = sort.direction === 'asc' ? 1 : -1
    if (typeof aValue === 'number' && typeof bValue === 'number') return (aValue - bValue) * direction
    return String(aValue).localeCompare(String(bValue)) * direction
  }), [sort, visibleRows])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const exportRows = (extension: 'csv' | 'xls') => {
    const headers = ['Coordinator Name', 'Assigned Tasks', 'Pending Tasks', 'In Progress Tasks', 'Completed Tasks', 'Overdue Tasks', 'Total Active Tasks', 'Workload Percentage']
    const body = sortedRows.map((row) => [
      row.coordinatorName,
      row.assignedTasks,
      row.pendingTasks,
      row.inProgressTasks,
      row.completedTasks,
      row.overdueTasks,
      row.totalActiveTasks,
      `${row.workloadPercentage}%`,
    ])
    const csv = [headers, ...body].map((line) => line.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `team-workload-report.${extension}`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <PageContainer title={user?.role === 'manager' ? undefined : "Team Workload Report"} description={user?.role === 'manager' ? undefined : "Coordinator workload distribution and performance."}>
      {user?.role === 'manager' ? <ManagerWorkspaceHeader title="Business insights and operational analytics." subtitle="Analyze workload, productivity, task trends, and performance metrics." /> : null}
      <div className="filter-card mb-3">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">Search coordinator</label>
            <input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search coordinator" />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Coordinator</label>
            <select className="form-select" value={coordinator} onChange={(event) => setCoordinator(event.target.value)}>
              <option value="all">All Coordinators</option>
              {coordinatorOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">From</label>
            <input className="form-control" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">To</label>
            <input className="form-control" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
          <div className="col-12 col-md-2 d-flex gap-2">
            <button className="btn btn-outline-secondary w-100" type="button" onClick={() => { setSearch(''); setCoordinator('all'); setFromDate(''); setToDate('') }}>Reset</button>
            <button className="btn btn-primary w-100" type="button" onClick={loadReport}>Apply</button>
          </div>
        </div>
      </div>

      {error ? <p className="dashboard-notice">{error}</p> : null}

      <div className="table-card">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-2">
          <div className="d-flex align-items-center gap-2">
            <small className="text-muted">Rows:</small>
            <select className="form-select form-select-sm" style={{ width: 90 }} value={String(pageSize)} onChange={(event) => setPageSize(Number(event.target.value))}>
              {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-success btn-sm" type="button" onClick={() => exportRows('csv')}><BsDownload className="me-1" />Export CSV</button>
            <button className="btn btn-success btn-sm" type="button" onClick={() => exportRows('xls')}><BsDownload className="me-1" />Export Excel</button>
          </div>
        </div>
        <div className="table-wrapper manager-reports-table__wrapper">
          <table className="table table-hover table-bordered align-middle manager-reports-table mb-0">
            <thead>
              <tr>
                {[
                  ['coordinatorName', 'Coordinator Name'],
                  ['assignedTasks', 'Assigned Tasks'],
                  ['pendingTasks', 'Pending Tasks'],
                  ['inProgressTasks', 'In Progress Tasks'],
                  ['completedTasks', 'Completed Tasks'],
                  ['overdueTasks', 'Overdue Tasks'],
                  ['totalActiveTasks', 'Total Active Tasks'],
                  ['workloadPercentage', 'Workload Percentage'],
                ].map(([key, label]) => (
                  <th key={key}>
                    <button type="button" className="manager-sort" onClick={() => handleSort(key as SortKey)}><span>{label}</span><BsArrowDownUp size={12} /></button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center">Loading...</td></tr>
              ) : pagedRows.length === 0 ? (
                <tr><td colSpan={8} className="text-center">No workload data found.</td></tr>
              ) : pagedRows.map((row) => (
                <tr key={row.coordinatorName}>
                  <td>{row.coordinatorName}</td>
                  <td>{row.assignedTasks}</td>
                  <td>{row.pendingTasks}</td>
                  <td>{row.inProgressTasks}</td>
                  <td>{row.completedTasks}</td>
                  <td>{row.overdueTasks}</td>
                  <td>{row.totalActiveTasks}</td>
                  <td>
                    <span className="d-inline-flex align-items-center gap-2">
                      <span>{row.workloadPercentage}%</span>
                      <span className={`badge ${row.workloadHealth.className}`}>{row.workloadHealth.label}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-2">
          <small className="text-muted">Showing {pagedRows.length} of {sortedRows.length} coordinators</small>
          <div className="btn-group">
            <button className="btn btn-outline-secondary btn-sm" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <button className="btn btn-outline-secondary btn-sm" type="button" disabled>Page {page} of {totalPages}</button>
            <button className="btn btn-outline-secondary btn-sm" type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}

export default TeamWorkloadReport
