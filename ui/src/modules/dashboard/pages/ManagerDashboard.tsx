import { useEffect, useMemo, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import TaskDetailsModal from '../../../shared/components/TaskDetailsModal'
import AnimatedModal from '../../../shared/components/AnimatedModal'
import { useAlert } from '../../../shared/alerts/useAlert'
import { assignManagerTask, getManagerAvailableExperts, getManagerDashboardSummary, getManagerTasksByStatus, type DashboardExpert, type DashboardTask } from '../api/dashboardApi'

const STATUS_ORDER = ['pending', 'assigned', 'completed', 'cancelled'] as const
const formatDate = (v?: string) => (v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—')
const toMins = (s?: string, e?: string) => { if (!s || !e) return '—'; const [sh, sm] = s.slice(0, 5).split(':').map(Number); const [eh, em] = e.slice(0, 5).split(':').map(Number); return `${Math.max(0, eh * 60 + em - (sh * 60 + sm))} mins` }
const statusClass = (status: string) => (status === 'completed' ? 'completed' : status === 'pending' ? 'pending' : status === 'cancelled' ? 'failed' : 'processing')

export default function ManagerDashboard() {
  const { showToast } = useAlert()
  const [summary, setSummary] = useState<any>(null)
  const [tasks, setTasks] = useState<DashboardTask[]>([])
  const [details, setDetails] = useState<DashboardTask | null>(null)
  const [editTask, setEditTask] = useState<DashboardTask | null>(null)
  const [experts, setExperts] = useState<DashboardExpert[]>([])
  const [selectedExpertId, setSelectedExpertId] = useState('')

  useEffect(() => { void (async () => { const [s, grouped] = await Promise.all([getManagerDashboardSummary(), Promise.all(STATUS_ORDER.map((x) => getManagerTasksByStatus(x)))]); setSummary(s); setTasks(grouped.flat().sort((a, b) => Number(b.id) - Number(a.id))) })() }, [])
  useEffect(() => { if (!editTask) return; void (async () => setExperts(await getManagerAvailableExperts({ taskDate: editTask.dueDate || '', startTime: editTask.startTime || '', endTime: editTask.endTime || '' })))() }, [editTask])

  const completed = tasks.filter((t) => t.status === 'completed')
  const revenue = completed.reduce((sum, t) => sum + Number(t.id) * 50, 0)
  const pendingPayments = tasks.filter((t) => t.status !== 'completed').length
  const successRate = tasks.length ? ((completed.length / tasks.length) * 100).toFixed(2) : '0.00'
  const workload = useMemo(() => {
    const m = new Map<string, { assigned: number; pending: number; overdue: number }>(); const now = new Date()
    tasks.forEach((t) => { const k = t.assignedToName || 'Unassigned'; const r = m.get(k) || { assigned: 0, pending: 0, overdue: 0 }; if (t.status === 'assigned') r.assigned++; if (t.status === 'pending') r.pending++; if (t.dueDate && new Date(t.dueDate) < now && !['completed', 'cancelled'].includes(t.status)) r.overdue++; m.set(k, r) })
    return [...m.entries()].map(([name, r]) => ({ name, ...r }))
  }, [tasks])

  return <PageContainer title="Dashboard-active" description="Home > Dashboard > Dashboard-active"><div className="manager-v2">
    <div className="manager-v2__kpis row g-3">{[
      ['Total Revenue', `INR ${revenue.toLocaleString('en-IN')}`, '+12.5% from last month', 'blue'],
      ['Pending Tasks', String(summary?.pendingTasks ?? 0), '+8.2% from last week', 'teal'],
      ['Pending Payment Updates', String(pendingPayments), '-2.1% from yesterday', 'green'],
      ['Success Rate', `${successRate}%`, '+0.3% from last month', 'indigo'],
    ].map((k) => <div className="col-12 col-md-6 col-lg-3" key={k[0]}><div className={`manager-v2__kpi manager-v2__kpi--${k[3]}`}><small>{k[0]}</small><h4>{k[1]}</h4><small>{k[2]}</small></div></div>)}</div>

    <div className="row g-3">
      <div className="col-lg-8">
        <div className="card manager-v2__card"><div className="card-header manager-v2__card-header"><h6>Pending Payments Updates</h6><div><button className="button">7D</button><button className="button button--primary">30D</button><button className="button">90D</button></div></div><div className="card-body manager-v2__card-body"><div className="roles-table__wrapper manager-v2__scroll-x manager-v2__scroll-y"><table className="roles-table"><thead><tr><th>DATE</th><th>CLIENT</th><th>CANDIDATE</th><th>AMOUNT</th><th>STATUS</th><th>DURATION</th><th>ACTIONS</th></tr></thead><tbody>{tasks.map((t) => <tr key={`pay-${t.id}`}><td>{formatDate(t.dueDate)}</td><td>{t.client || '—'}</td><td><div className="user-cell"><div className="avatar">{(t.candidate || 'U')[0].toUpperCase()}</div><span>{t.candidate || '—'}</span></div></td><td>₹{(Number(t.id) * 50).toLocaleString('en-IN')}</td><td><span className={`badge ${statusClass(t.status)}`}>{t.status}</span></td><td>{toMins(t.startTime, t.endTime)}</td><td><button className="button" onClick={() => setDetails(t)}>👁️</button><button className="button" onClick={() => setEditTask(t)}>✏️</button></td></tr>)}</tbody></table></div></div></div>

        <div className="card manager-v2__card"><div className="card-header manager-v2__card-header"><h6>Recent Completed Tasks</h6><div><button className="button">Export</button><button className="button button--primary">+ Add New</button></div></div><div className="card-body manager-v2__card-body"><div className="roles-table__wrapper manager-v2__scroll-x manager-v2__scroll-y"><table className="roles-table"><thead><tr><th>SR NO</th><th>STATUS</th><th>DATE</th><th>CANDIDATE</th><th>COMPANY</th><th>TIME</th><th>ASSIGN TO</th></tr></thead><tbody>{completed.map((t, i) => <tr key={`ov-${t.id}`}><td>{i + 1}</td><td><span className={`badge ${statusClass(t.status)}`}>{t.status}</span></td><td>{formatDate(t.dueDate)}</td><td>{t.candidate || '—'}</td><td>{t.client || '—'}</td><td>{t.startTime || '—'} / {t.endTime || '—'}</td><td>{t.assignedToName || '—'}</td></tr>)}</tbody></table></div></div></div>
      </div>

      <div className="col-lg-4">
        <div className="card manager-v2__card"><div className="card-header manager-v2__card-header"><h6>Team Workload</h6></div><div className="card-body manager-v2__card-body"><div className="roles-table__wrapper manager-v2__scroll-x manager-v2__scroll-y--small"><table className="roles-table"><thead><tr><th>COORDINATOR</th><th>ASSIGNED</th><th>PENDING</th><th>OV</th></tr></thead><tbody>{workload.map((w) => <tr key={w.name}><td>{w.name}</td><td>{w.assigned}</td><td>{w.pending}</td><td>{w.overdue}</td></tr>)}</tbody></table></div></div></div>
        <div className="card manager-v2__card"><div className="card-header manager-v2__card-header"><h6>Live Activity Feed</h6><span className="activity-live"><span className="activity-live__dot"/> Live</span></div><div className="card-body manager-v2__card-body manager-v2__scroll-y--medium">{tasks.slice(0, 8).map((t) => <div key={`act-${t.id}`} className="activity"><div className="activity-timeline__title">{t.candidate || 'Candidate Name'} | {t.client || 'client Name'}</div><div className="activity-timeline__meta">{t.supportType || 'Task Type'}</div><div className="activity-timeline__meta">{formatDate(t.dueDate)} | {t.startTime || 'Time In/Out'}</div></div>)}<button className="button" style={{ width: '100%' }}>View All Activities</button></div></div>
      </div>
    </div></div>

    <TaskDetailsModal isOpen={Boolean(details)} role="manager" task={details ? { taskId: Number(details.id), title: details.title, status: details.status, candidateName: details.candidate || '—', companyName: details.client || '—', supportType: details.supportType || '—', assignedTo: details.assignedToName || '—', dueDate: details.dueDate, startTime: details.startTime, endTime: details.endTime, description: details.description || '' } : null} onClose={() => setDetails(null)} />
    <AnimatedModal isOpen={Boolean(editTask)} title="Assign/Reassign" onClose={() => setEditTask(null)}><div className="roles-table__wrapper"><table className="roles-table"><thead><tr><th>Expert</th><th>Status</th><th>Action</th></tr></thead><tbody>{experts.map((e) => <tr key={e.id}><td>{e.name}</td><td>{e.status}</td><td><button className="button" onClick={() => setSelectedExpertId(e.id)}>{selectedExpertId === e.id ? 'Selected' : 'Select'}</button></td></tr>)}</tbody></table></div><div className="modal-actions"><button className="button" onClick={() => setEditTask(null)}>Cancel</button><button className="button button--primary" onClick={async () => { if (!editTask || !selectedExpertId) return; await assignManagerTask(editTask.id, selectedExpertId); showToast({ type: 'success', message: 'Task updated' }); setEditTask(null) }}>Save</button></div></AnimatedModal>
  </PageContainer>
}
