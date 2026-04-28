import { useEffect, useMemo, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import { getClients, type ClientItem } from '../../clients/api/clientsApi'
import { getBulkPriceTasks, updateTaskPrices, type BulkPriceTaskRecord } from '../api/tasksApi'
import { useAlert } from '../../../shared/alerts/useAlert'
import './bulkPrice.css'

type EditableTask = BulkPriceTaskRecord & {
  modified?: boolean
}

const formatDate = (value: string) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

const BulkPriceUpdatePage = () => {
  const { showToast } = useAlert()

  const [clients, setClients] = useState<ClientItem[]>([])
  const [tasks, setTasks] = useState<EditableTask[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [clientId, setClientId] = useState('')
  const [search, setSearch] = useState('')

  const [viewTask, setViewTask] = useState<EditableTask | null>(null)
  const [editTask, setEditTask] = useState<EditableTask | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getBulkPriceTasks({
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        client_id: clientId ? Number(clientId) : undefined,
        search: search.trim() || undefined,
      })
      setTasks(data.map((task) => ({ ...task, modified: false })))
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load bulk price tasks.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadClients = async () => {
      try {
        setClients(await getClients())
      } catch {
        setClients([])
      }
    }

    void loadClients()
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const modifiedTasks = useMemo(() => tasks.filter((task) => task.modified), [tasks])

  const onReset = () => {
    setFromDate('')
    setToDate('')
    setClientId('')
    setSearch('')
  }

  const onUpdatePrices = async () => {
    if (!modifiedTasks.length) {
      showToast({ type: 'warning', message: 'No modified rows found.' })
      return
    }

    const payload = modifiedTasks.map((task) => ({
      task_id: task.id,
      amount: Number(task.total_amount),
      updated_fields: {
        status: task.status,
        date: task.due_date.slice(0, 10),
        assign_to: task.assigned_to_name,
        time_in_out: `${task.start_time || ''}/${task.end_time || ''}`,
      },
    }))

    setUpdating(true)
    try {
      await updateTaskPrices(payload)
      showToast({ type: 'success', message: 'Prices updated successfully.' })
      await loadData()
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update prices.' })
    } finally {
      setUpdating(false)
    }
  }

  const applyInlineAmount = (taskId: number, nextValue: string) => {
    const asNumber = Number(nextValue)
    if (!Number.isFinite(asNumber) || asNumber < 0) return
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, total_amount: asNumber, modified: true } : task)))
  }

  const saveEditModal = () => {
    if (!editTask) return
    setTasks((prev) => prev.map((row) => (row.id === editTask.id ? { ...editTask, modified: true } : row)))
    setEditTask(null)
  }

  return (
    <PageContainer title="Bulk Price Update" description="Update completed task pricing in bulk for dynamic invoice recalculation.">
      <section className="filter-card">
        <div className="filter-grid">
          <label className="filter-field"><span>From Date</span><input className="filter-input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
          <label className="filter-field"><span>To Date</span><input className="filter-input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
          <label className="filter-field"><span>Client</span><select className="filter-input" value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">All Clients</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company_name || client.name}</option>)}</select></label>
          <label className="filter-field"><span>Search</span><input className="filter-input" type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="candidate / company / support type" /></label>
        </div>
        <div className="filter-actions">
          <button type="button" className="button" onClick={() => void loadData()} disabled={loading}>{loading ? 'Loading tasks...' : 'Apply Filters'}</button>
          <button type="button" className="button" onClick={onReset} disabled={loading || updating}>Reset</button>
          <button type="button" className="button primary-btn" onClick={() => void onUpdatePrices()} disabled={updating || modifiedTasks.length === 0}>{updating ? 'Updating...' : 'Update Prices'}</button>
        </div>
      </section>

      <section className="table-card">
        <div className="bulk-table-wrapper">
          <table className="table bulk-table">
            <thead><tr><th>Action</th><th>Amount</th><th>Status</th><th>Date</th><th>Candidate Name</th><th>Company Name</th><th>Time In/Out</th><th>Assign To</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="bulk-empty-state">Loading tasks...</td></tr> : tasks.length === 0 ? <tr><td colSpan={8} className="bulk-empty-state"><strong>No unpaid tasks found</strong></td></tr> : tasks.map((task) => (
                <tr key={task.id} className={task.modified ? 'row-modified' : ''}>
                  <td>
                    <button type="button" className="button" onClick={() => setViewTask(task)}>View</button>
                    <button type="button" className="button" onClick={() => setEditTask(task)}>Edit</button>
                  </td>
                  <td><input className="amount-input" type="number" min={0} value={task.total_amount} onChange={(event) => applyInlineAmount(task.id, event.target.value)} /></td>
                  <td>{task.status}</td>
                  <td>{formatDate(task.due_date)}</td>
                  <td>{task.candidate_name || '-'}</td>
                  <td>{task.company_name || '-'}</td>
                  <td>{task.start_time || '-'} / {task.end_time || '-'}</td>
                  <td>{task.assigned_to_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {viewTask ? (
        <div className="modal-overlay"><div className="modal-card"><h3>Task Details</h3><p><b>Amount:</b> {viewTask.total_amount}</p><p><b>Status:</b> {viewTask.status}</p><p><b>Date:</b> {formatDate(viewTask.due_date)}</p><p><b>Candidate Name:</b> {viewTask.candidate_name}</p><p><b>Company Name:</b> {viewTask.company_name}</p><p><b>Time In/Out:</b> {viewTask.start_time} / {viewTask.end_time}</p><p><b>Assign To:</b> {viewTask.assigned_to_name}</p><button className="button" onClick={() => setViewTask(null)}>Close</button></div></div>
      ) : null}

      {editTask ? (
        <div className="modal-overlay"><div className="modal-card"><h3>Edit Task</h3>
          <label className="filter-field"><span>Amount</span><input className="filter-input" type="number" min={0} value={editTask.total_amount} onChange={(event) => setEditTask((prev) => (prev ? { ...prev, total_amount: Number(event.target.value) || 0 } : null))} /></label>
          <label className="filter-field"><span>Status</span><select className="filter-input" value={editTask.status} onChange={(event) => setEditTask((prev) => (prev ? { ...prev, status: event.target.value } : null))}><option value="completed">completed</option><option value="assigned">assigned</option><option value="pending">pending</option></select></label>
          <label className="filter-field"><span>Date</span><input className="filter-input" type="date" value={editTask.due_date.slice(0, 10)} onChange={(event) => setEditTask((prev) => (prev ? { ...prev, due_date: event.target.value } : null))} /></label>
          <label className="filter-field"><span>Candidate Name</span><input className="filter-input" value={editTask.candidate_name} onChange={(event) => setEditTask((prev) => (prev ? { ...prev, candidate_name: event.target.value } : null))} /></label>
          <label className="filter-field"><span>Company Name</span><input className="filter-input" value={editTask.company_name} onChange={(event) => setEditTask((prev) => (prev ? { ...prev, company_name: event.target.value } : null))} /></label>
          <label className="filter-field"><span>Time In/Out</span><input className="filter-input" value={`${editTask.start_time || ''}/${editTask.end_time || ''}`} onChange={(event) => {
            const [start = '', end = ''] = event.target.value.split('/').map((item) => item.trim())
            setEditTask((prev) => (prev ? { ...prev, start_time: start, end_time: end } : null))
          }} /></label>
          <label className="filter-field"><span>Assign To</span><input className="filter-input" value={editTask.assigned_to_name} onChange={(event) => setEditTask((prev) => (prev ? { ...prev, assigned_to_name: event.target.value } : null))} /></label>
          <div className="filter-actions"><button className="button" onClick={() => setEditTask(null)}>Cancel</button><button className="button primary-btn" onClick={saveEditModal}>Save Changes</button></div>
        </div></div>
      ) : null}
    </PageContainer>
  )
}

export default BulkPriceUpdatePage
