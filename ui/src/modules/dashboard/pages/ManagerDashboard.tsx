import { useEffect, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import { getManagerDashboardSummary, getManagerTasksByStatus, type DashboardTask } from '../api/dashboardApi'

type SummaryState = {
  totalRevenue: number
  revenueGrowth: string
  pendingTasks: number
  tasksGrowth: string
  pendingPayments: number
  paymentsChange: string
  successRate: string
  successGrowth: string
}

const defaultSummary: SummaryState = {
  totalRevenue: 0,
  revenueGrowth: '+0.0%',
  pendingTasks: 0,
  tasksGrowth: '+0.0%',
  pendingPayments: 0,
  paymentsChange: '+0.0%',
  successRate: '0.00%',
  successGrowth: '+0.0%',
}

const formatINR = (amount: number) => `₹${amount.toLocaleString('en-IN')}`
const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : '—')

export default function ManagerDashboard() {
  const [summary, setSummary] = useState<SummaryState>(defaultSummary)
  const [tasks, setTasks] = useState<DashboardTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [response, pending, assigned, completed] = await Promise.all([
          getManagerDashboardSummary(),
          getManagerTasksByStatus('pending'),
          getManagerTasksByStatus('assigned'),
          getManagerTasksByStatus('completed'),
        ])
        setTasks([...pending, ...assigned, ...completed].slice(0, 20))
        setSummary({
          totalRevenue: Number(response.totalRevenue ?? 0),
          revenueGrowth: String(response.revenueGrowth ?? '+12.5%'),
          pendingTasks: Number(response.pendingTasks ?? 0),
          tasksGrowth: String(response.tasksGrowth ?? '+8.2%'),
          pendingPayments: Number(response.pendingPayments ?? response.pendingPaymentUpdates ?? 0),
          paymentsChange: String(response.paymentsChange ?? '-2.1%'),
          successRate: String(response.successRate ?? '3.47%'),
          successGrowth: String(response.successGrowth ?? '+0.3%'),
        })
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const teamWorkload = (() => {
    const map = new Map<string, { assigned: number; pending: number }>()
    tasks.forEach((task) => {
      const name = task.assignedToName || 'Unassigned'
      const prev = map.get(name) || { assigned: 0, pending: 0 }
      if (task.status === 'assigned') prev.assigned += 1
      if (task.status === 'pending') prev.pending += 1
      map.set(name, prev)
    })
    return [...map.entries()].slice(0, 6)
  })()

  return (
    <PageContainer title="Dashboard-active" description="Home > Dashboard > Dashboard-active">
      <div className="pc-container">
        <div className="pc-content">
          {error ? <div className="alert alert-danger">{error}</div> : null}

          <div className="row g-3 mb-3">
            <div className="col-md-6 col-xl-3"><div className="card bg-primary"><div className="card-body d-flex justify-content-between align-items-center"><div><h6 className="text-white mb-2">Total Revenue</h6><h3 className="text-white mb-0 f-w-300">{formatINR(summary.totalRevenue)}</h3><p className="text-white-50 mb-0">{summary.revenueGrowth} from last month</p></div><i className="ph ph-chart-line-up text-white f-30" /></div></div></div>
            <div className="col-md-6 col-xl-3"><div className="card bg-info"><div className="card-body d-flex justify-content-between align-items-center"><div><h6 className="text-white mb-2">Pending Tasks</h6><h3 className="text-white mb-0 f-w-300">{summary.pendingTasks.toLocaleString('en-IN')}</h3><p className="text-white-50 mb-0">{summary.tasksGrowth} from last week</p></div><i className="ph ph-list-checks text-white f-30" /></div></div></div>
            <div className="col-md-6 col-xl-3"><div className="card bg-success"><div className="card-body d-flex justify-content-between align-items-center"><div><h6 className="text-white mb-2">Pending Payments</h6><h3 className="text-white mb-0 f-w-300">{summary.pendingPayments.toLocaleString('en-IN')}</h3><p className="text-white-50 mb-0">{summary.paymentsChange} from yesterday</p></div><i className="ph ph-wallet text-white f-30" /></div></div></div>
            <div className="col-md-6 col-xl-3"><div className="card bg-dark"><div className="card-body d-flex justify-content-between align-items-center"><div><h6 className="text-white mb-2">Success Rate</h6><h3 className="text-white mb-0 f-w-300">{summary.successRate}</h3><p className="text-white-50 mb-0">{summary.successGrowth} from last month</p></div><i className="ph ph-chart-pie text-white f-30" /></div></div></div>
          </div>

          <div className="row g-3">
            <div className="col-xl-8">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center"><h5>Pending Payments Updates</h5></div>
                <div className="card-body table-responsive">
                  <table className="table table-hover">
                    <thead><tr><th>Date</th><th>Client</th><th>Candidate</th><th>Amount</th><th>Status</th><th>Duration</th><th className="text-center">Actions</th></tr></thead>
                    <tbody>
                      {loading ? <tr><td colSpan={7}>Loading...</td></tr> : tasks.slice(0, 6).map((task) => <tr key={`payment-${task.id}`}><td>{formatDate(task.dueDate)}</td><td>{task.client}</td><td>{task.candidate}</td><td className="text-success">{formatINR(300)}</td><td><span className={`badge ${task.status === 'completed' ? 'bg-success' : 'bg-warning text-dark'}`}>{task.status}</span></td><td>30 mins</td><td className="text-center"><div className="btn-group"><button className="btn btn-light btn-sm"><i className="ph ph-eye" /></button><button className="btn btn-light btn-sm"><i className="ph ph-pencil" /></button><button className="btn btn-light btn-sm"><i className="ph ph-trash" /></button></div></td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-xl-4">
              <div className="card"><div className="card-header"><h5>Team Workload</h5></div><div className="card-body"><table className="table"><thead><tr><th>Coordinator</th><th>Assigned</th><th>Pending</th></tr></thead><tbody>{teamWorkload.length ? teamWorkload.map(([name, value]) => <tr key={name}><td>{name}</td><td>{value.assigned}</td><td className="text-warning">{value.pending}</td></tr>) : <tr><td colSpan={3}>No data</td></tr>}</tbody></table></div></div>
            </div>

            <div className="col-xl-8">
              <div className="card"><div className="card-header d-flex justify-content-between"><h5>Tasks Overview</h5><button className="btn btn-primary btn-sm">+ Add</button></div><div className="card-body table-responsive"><table className="table"><thead><tr><th>#</th><th>Status</th><th>Date</th><th>Candidate</th><th>Company</th><th>Time</th><th>Assign</th></tr></thead><tbody>{tasks.slice(0, 6).map((task, index) => <tr key={`task-${task.id}`}><td>{index + 1}</td><td><span className={`badge ${task.status === 'completed' ? 'bg-success' : 'bg-info'}`}>{task.status}</span></td><td>{formatDate(task.dueDate)}</td><td>{task.candidate}</td><td>{task.client}</td><td>{task.startTime || '02:30'}</td><td>{task.assignedToName || '—'}</td></tr>)}</tbody></table></div></div>
            </div>

            <div className="col-xl-4">
              <div className="card"><div className="card-header d-flex justify-content-between"><h5>Live Activity Feed</h5><span className="text-success small">● Live</span></div><div className="card-body">{tasks.slice(0, 4).map((task) => <div key={`activity-${task.id}`} className="p-2 mb-2 rounded manager-activity-item"><h6 className="mb-1">{task.candidate} | {task.client}</h6><p className="mb-1 text-muted f-12">{task.supportType || 'Task Type'}</p><span className="text-muted f-10">{formatDate(task.dueDate)} | {task.startTime || 'Time'}</span></div>)}<button className="btn btn-outline-primary btn-sm w-100 mt-2">View All Activities</button></div></div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
