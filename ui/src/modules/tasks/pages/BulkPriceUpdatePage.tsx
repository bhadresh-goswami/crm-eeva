import { useEffect, useMemo, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import { getClients, type ClientItem } from '../../clients/api/clientsApi'
import { getBulkPriceTasks, updateTaskPrices, type BulkPriceTaskRecord } from '../api/tasksApi'
import { useAlert } from '../../../shared/alerts/useAlert'
import './bulkPrice.css'

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
  const [amountByTask, setAmountByTask] = useState<Record<number, string>>({})
  const [initialAmountByTask, setInitialAmountByTask] = useState<Record<number, string>>({})
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
      const mappedAmounts = data.reduce<Record<number, string>>((map, item) => {
          map[item.id] = String(item.total_amount || 0)
          return map
        }, {})
      setAmountByTask(mappedAmounts)
      setInitialAmountByTask(mappedAmounts)
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

  const editableTaskIds = useMemo(
    () => tasks.filter((task) => task.status !== 'cancelled' && task.invoice_status !== 'paid').map((task) => task.id),
    [tasks],
  )
  const changedRowsCount = useMemo(
    () => editableTaskIds.filter((id) => (amountByTask[id] ?? '') !== (initialAmountByTask[id] ?? '')).length,
    [amountByTask, editableTaskIds, initialAmountByTask],
  )

  const onReset = () => {
    setFromDate('')
    setToDate('')
    setClientId('')
    setSearch('')
  }

  const onUpdatePrices = async () => {
    const updates = editableTaskIds
      .map((id) => ({ task_id: id, amount: Number(amountByTask[id] ?? 0) }))
      .filter((item) => String(item.amount) !== String(Number(initialAmountByTask[item.task_id] ?? 0)))
      .filter((item) => Number.isFinite(item.amount) && item.amount >= 0)

    if (!updates.length) {
      showToast({ type: 'warning', message: 'Select at least one editable task and enter valid amount.' })
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
      <section className="filter-card">
        <div className="filter-grid">
          <label className="filter-field">
            <span>From Date</span>
            <input className="filter-input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label className="filter-field">
            <span>To Date</span>
            <input className="filter-input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
          <label className="filter-field">
            <span>Client</span>
            <select className="filter-input" value={clientId} onChange={(event) => setClientId(event.target.value)}>
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company_name || client.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Search</span>
            <input
              className="filter-input"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="candidate / company / support type"
            />
          </label>
        </div>

        <div className="filter-actions">
          <button type="button" className="button" onClick={() => void loadData()} disabled={loading}>
            {loading ? 'Loading tasks...' : 'Apply Filters'}
          </button>
          <button type="button" className="button" onClick={onReset} disabled={loading || updating}>
            Reset
          </button>
          <button type="button" className="button primary-btn" onClick={() => void onUpdatePrices()} disabled={updating || changedRowsCount === 0}>
            {updating ? 'Updating...' : 'Update Prices'}
          </button>
        </div>
      </section>

      <section className="table-card">
        <div className="bulk-table-wrapper">
          <table className="table bulk-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Candidate Name</th>
                <th>Company Name</th>
                <th>Time In/Out</th>
                <th>Assign To</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="bulk-empty-state">Loading tasks...</td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="bulk-empty-state">
                    <strong>No tasks found for selected filters.</strong>
                    <span>Try changing date or client.</span>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const isDisabled = task.status === 'cancelled' || task.invoice_status === 'paid'
                  const isEditable = !isDisabled && task.total_amount === 0
                  return (
                    <tr key={task.id} className={isDisabled ? 'row-disabled' : isEditable ? 'row-editable' : ''}>
                      <td>View</td>
                      <td>
                        <input
                          className="amount-input"
                          type="number"
                          value={amountByTask[task.id] ?? '0'}
                          disabled={!isEditable}
                          onChange={(event) => setAmountByTask((prev) => ({ ...prev, [task.id]: event.target.value }))}
                        />
                      </td>
                      <td>{task.status}</td>
                      <td>{formatDate(task.due_date)}</td>
                      <td>{task.candidate_name || '-'}</td>
                      <td>{task.company_name || '-'}</td>
                      <td>{task.start_time || '-'} / {task.end_time || '-'}</td>
                      <td>{task.assigned_to_name || '-'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageContainer>
  )
}

export default BulkPriceUpdatePage
