import { useMemo, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import '../invoices.css'

type TaskStatus = 'Pending' | 'Paid'

type InvoiceTask = {
  taskId: string
  supportType: string
  amount: number
  status: TaskStatus
}

const taskSeed: InvoiceTask[] = [
  { taskId: 'TASK-2001', supportType: 'Call of Duty Support', amount: 64.5, status: 'Pending' },
  { taskId: 'TASK-2003', supportType: 'Racing Game Support', amount: 50, status: 'Pending' },
  { taskId: 'TASK-2004', supportType: 'DVD Support', amount: 10.7, status: 'Paid' },
]

const InvoiceDetailPage = () => {
  const params = new URLSearchParams(window.location.search)
  const invoiceId = params.get('invoiceId') || 'INV-0007612'

  const [tasks, setTasks] = useState(taskSeed)
  const [savedMessage, setSavedMessage] = useState('')

  const total = useMemo(() => tasks.reduce((sum, task) => sum + task.amount, 0), [tasks])
  const paidCount = useMemo(() => tasks.filter((task) => task.status === 'Paid').length, [tasks])

  return (
    <PageContainer title="Invoice Detail" description="Invoice header and task-level payment management.">
      <div className="invoice-layout">
        <section className="invoice-surface invoice-header-strip">
          <div>
            <h3 className="invoice-header-title">{invoiceId}</h3>
            <p className="invoice-header-meta">Client: John Doe</p>
            <p className="invoice-header-meta">Date Range: Apr 01, 2026 - Apr 24, 2026</p>
          </div>
          <div className="invoice-header-stats">
            <p>Tasks Paid: {paidCount}/{tasks.length}</p>
            <p>Total: ₹{total.toFixed(2)}</p>
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
              {tasks.map((task) => (
                <tr key={task.taskId}>
                  <td>{task.taskId}</td>
                  <td>{task.supportType}</td>
                  <td>₹{task.amount.toFixed(2)}</td>
                  <td>
                    <select
                      className="invoice-status-select"
                      value={task.status}
                      onChange={(event) => {
                        const nextStatus = event.target.value as TaskStatus
                        setTasks((prev) => prev.map((row) => (row.taskId === task.taskId ? { ...row, status: nextStatus } : row)))
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                setSavedMessage(`Saved ${tasks.length} task status update(s).`)
              }}
            >
              Save
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                setTasks((prev) => prev.map((task) => ({ ...task, status: 'Paid' })))
                setSavedMessage('All tasks marked as paid.')
              }}
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
