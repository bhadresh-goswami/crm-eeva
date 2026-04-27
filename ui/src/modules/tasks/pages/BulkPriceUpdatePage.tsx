import { useEffect, useMemo, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import { getClients, type ClientItem } from '../../clients/api/clientsApi'
import { getBulkPriceTasks, updateTaskPrices, type BulkPriceTaskRecord } from '../api/tasksApi'
import { useAlert } from '../../../shared/alerts/useAlert'

const formatDate = (value: string) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

const BulkPriceUpdatePage = () => {
  const { showToast } = useAlert()

  const [clients, setClients] = useState<ClientItem[]>([])
  const [tasks, setTasks] = useState<BulkPriceTaskRecord[]>([])
  const [checkedTaskIds, setCheckedTaskIds] = useState<number[]>([])
  const [amountByTask, setAmountByTask] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [clientId, setClientId] = useState('')
  const [search, setSearch] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getBulkPriceTasks({
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        client_id: clientId ? Number(clientId) : undefined,
        search: search.trim() || undefined,
      })
      setTasks(data)
      setCheckedTaskIds([])
      setAmountByTask(data.reduce<Record<number, string>>((map, item) => {
        map[item.id] = String(item.total_amount || 0)
        return map
      }, {}))
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
  }, [])

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectableTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'cancelled' && task.invoice_status !== 'paid'),
    [tasks],
  )

  const allSelected = selectableTasks.length > 0 && selectableTasks.every((task) => checkedTaskIds.includes(task.id))

  const onUpdatePrices = async () => {
    const updates = checkedTaskIds
      .map((id) => ({ task_id: id, amount: Number(amountByTask[id] ?? 0) }))
      .filter((item) => Number.isFinite(item.amount) && item.amount >= 0)

    if (!updates.length) {
      showToast({ type: 'warning', message: 'Select at least one task with valid amount.' })
      return
    }

    setUpdating(true)
    try {
      await updateTaskPrices(updates)
      showToast({ type: 'success', message: 'Task prices updated successfully.' })
      await loadData()
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update prices.' })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <PageContainer title="Bulk Price Update" description="Update completed task pricing in bulk for dynamic invoice recalculation.">
      <section className="card section">
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))' }}>
          <label>
            <span>From Date</span>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label>
            <span>To Date</span>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
          <label>
            <span>Client</span>
            <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.company_name || client.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Search</span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="candidate / company / support type"
            />
          </label>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <button type="button" className="button" onClick={() => void loadData()} disabled={loading}>{loading ? 'Loading...' : 'Apply Filters'}</button>
          <button type="button" className="button button--primary" onClick={() => void onUpdatePrices()} disabled={updating || !checkedTaskIds.length}>
            {updating ? 'Updating...' : 'Update Price'}
          </button>
        </div>
      </section>

      <section className="card section roles-table__wrapper">
        <table className="roles-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={allSelected} onChange={(event) => {
                setCheckedTaskIds(event.target.checked ? selectableTasks.map((task) => task.id) : [])
              }} /></th>
              <th>Action</th>
              <th>Description</th>
              <th>SR No</th>
              <th>Date</th>
              <th>Candidate</th>
              <th>Company</th>
              <th>Status</th>
              <th>Assign To</th>
              <th>Time Start</th>
              <th>Time End</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan={12} className="dashboard-empty">No tasks found.</td></tr>
            ) : tasks.map((task, index) => {
              const disabled = task.status === 'cancelled' || task.invoice_status === 'paid'
              return (
                <tr key={task.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={checkedTaskIds.includes(task.id)}
                      disabled={disabled}
                      onChange={(event) => {
                        setCheckedTaskIds((prev) => event.target.checked ? [...prev, task.id] : prev.filter((id) => id !== task.id))
                      }}
                    />
                  </td>
                  <td><button type="button" className="button" disabled>View</button></td>
                  <td>{task.description || '-'}</td>
                  <td>{index + 1}</td>
                  <td>{formatDate(task.due_date)}</td>
                  <td>{task.candidate_name || '-'}</td>
                  <td>{task.company_name || '-'}</td>
                  <td>{task.status}</td>
                  <td>{task.assigned_to_name || '-'}</td>
                  <td>{task.start_time || '-'}</td>
                  <td>{task.end_time || '-'}</td>
                  <td>
                    <input
                      type="number"
                      value={amountByTask[task.id] ?? '0'}
                      disabled={disabled || task.total_amount > 0}
                      onChange={(event) => setAmountByTask((prev) => ({ ...prev, [task.id]: event.target.value }))}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </PageContainer>
  )
}

export default BulkPriceUpdatePage
