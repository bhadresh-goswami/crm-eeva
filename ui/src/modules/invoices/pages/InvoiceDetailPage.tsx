import { useEffect, useMemo, useState } from 'react'
import { useAlert } from '../../../shared/alerts/useAlert'
import { getInvoiceById, updateInvoiceStatus, type InvoiceItemRecord } from '../api/invoicesApi'
import PageContainer from '../../../shared/components/PageContainer'
import ManagerWorkspaceHeader from '../../../shared/components/ManagerWorkspaceHeader'
import { useAuth } from '../../../context/AuthContext'
import '../invoices.css'

type TaskStatus = InvoiceItemRecord['status']

type EditableTask = {
  taskId: number
  supportType: string
  amount: number
  status: TaskStatus
}

const formatCurrency = (value: number) => `₹${value.toFixed(2)}`

const formatDate = (value: string) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

const statusLabel = (status: string) => {
  if (status === 'paid') return 'Paid'
  if (status === 'partial') return 'Partial'
  return 'Pending'
}

const toInvoiceStatus = (tasks: EditableTask[]) => {
  if (!tasks.length) return 'pending'
  const paidCount = tasks.filter((task) => task.status === 'paid' || task.status === 'settled').length
  if (paidCount === 0) return 'pending'
  if (paidCount === tasks.length) return 'paid'
  return 'partial'
}

const InvoiceDetailPage = () => {
  const { user } = useAuth()
  const { showToast } = useAlert()
  const params = new URLSearchParams(window.location.search)
  const invoiceId = Number(params.get('invoiceId') ?? 0)

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [clientName, setClientName] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [tasks, setTasks] = useState<EditableTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [invoiceStatus, setInvoiceStatus] = useState<'pending' | 'partial' | 'paid'>('pending')

  const total = useMemo(() => tasks.reduce((sum, task) => sum + task.amount, 0), [tasks])
  const paidCount = useMemo(() => tasks.filter((task) => task.status === 'paid' || task.status === 'settled').length, [tasks])

  useEffect(() => {
    const loadInvoice = async () => {
      if (!invoiceId) {
        showToast({ type: 'error', message: 'Invalid invoice id.' })
        return
      }

      setIsLoading(true)
      try {
        const detail = await getInvoiceById(invoiceId)
        setInvoiceNumber(detail.invoice_number || `#${detail.id}`)
        setClientName(detail.company_name || detail.client_name)
        setFromDate(detail.from_date)
        setToDate(detail.to_date)
        setTasks(detail.items.map((item) => ({ taskId: item.task_id, supportType: item.support_type, amount: item.amount, status: item.status })))
        setInvoiceStatus(detail.status)
      } catch (error) {
        showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load invoice details.' })
      } finally {
        setIsLoading(false)
      }
    }

    void loadInvoice()
  }, [invoiceId, showToast])

  const persistStatuses = async (nextTasks: EditableTask[], successMessage: string) => {
    if (!invoiceId) return

    setIsSaving(true)
    try {
      const response = await updateInvoiceStatus(
        invoiceId,
        nextTasks.map((task) => ({ task_id: task.taskId, status: task.status })),
      )

      const nextInvoiceStatus = String(response?.data?.status ?? toInvoiceStatus(nextTasks)).toLowerCase()
      setInvoiceStatus(nextInvoiceStatus === 'paid' || nextInvoiceStatus === 'partial' ? nextInvoiceStatus : 'pending')
      setSavedMessage(successMessage)
      showToast({ type: 'success', message: successMessage })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update payment status.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PageContainer title={user?.role === 'manager' ? undefined : "Invoice Detail"} description={user?.role === 'manager' ? undefined : "Invoice header and task-level payment management."}>
      {user?.role === 'manager' ? <ManagerWorkspaceHeader title="Monitor billing and payment activity." subtitle="Track invoices, pending payments, collections, and financial performance." /> : null}
      <div className="invoice-layout">
        <section className="invoice-surface invoice-header-strip">
          <div>
            <h3 className="invoice-header-title">{invoiceNumber || '-'}</h3>
            <p className="invoice-header-meta">Client: {clientName || '-'}</p>
            <p className="invoice-header-meta">Date Range: {formatDate(fromDate)} - {formatDate(toDate)}</p>
          </div>
          <div className="invoice-header-stats">
            <p>Tasks Paid: {paidCount}/{tasks.length}</p>
            <p>Total: {formatCurrency(total)}</p>
            <p>Status: {statusLabel(invoiceStatus)}</p>
          </div>
        </section>

        <section className="invoice-surface invoice-table-shell">
          <table className="invoice-grid-table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Support Type</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="invoice-empty-row">Loading invoice tasks...</td>
                </tr>
              ) : tasks.length ? (
                tasks.map((task) => (
                  <tr key={task.taskId}>
                    <td>{task.taskId}</td>
                    <td>{task.supportType}</td>
                    <td>{formatCurrency(task.amount)}</td>
                    <td>
                      <select
                        className="invoice-status-select"
                        value={task.status}
                        onChange={(event) => {
                          const nextStatus = event.target.value as TaskStatus
                          setTasks((prev) => prev.map((row) => (row.taskId === task.taskId ? { ...row, status: nextStatus } : row)))
                          setSavedMessage('')
                        }}
                      >
                        <option value="not_paid">Not Paid</option>
                        <option value="paid">Paid</option>
                        <option value="settled">Settled</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="invoice-empty-row">No invoice tasks found.</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="invoice-actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => void persistStatuses(tasks, `Saved ${tasks.length} task status update(s).`)}
              disabled={isSaving || !tasks.length || isLoading}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                const nextTasks = tasks.map((task) => ({ ...task, status: 'paid' as TaskStatus }))
                setTasks(nextTasks)
                void persistStatuses(nextTasks, 'All tasks marked as paid.')
              }}
              disabled={isSaving || !tasks.length || isLoading}
            >
              Mark All Paid
            </button>
          </div>
          {savedMessage ? <p className="invoice-help-text">{savedMessage}</p> : null}
        </section>
      </div>
    </PageContainer>
  )
}

export default InvoiceDetailPage
