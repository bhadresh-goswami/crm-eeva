import { useMemo, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import '../invoices.css'

type TaskStatus = 'pending' | 'paid'

type InvoiceTask = {
  taskId: string
  supportType: string
  amount: string
  status: TaskStatus
}

const initialTasks: InvoiceTask[] = [
  { taskId: 'TASK-1023', supportType: 'Call of Duty Support', amount: '₹64.50', status: 'pending' },
  { taskId: 'TASK-1024', supportType: 'Racing Game Support', amount: '₹50.00', status: 'pending' },
  { taskId: 'TASK-1025', supportType: 'DVD Support', amount: '₹10.70', status: 'paid' },
]

const InvoiceDetailPage = () => {
  const invoiceId = decodeURIComponent(window.location.pathname.split('/').pop() ?? 'INV-0007612')
  const [tasks, setTasks] = useState(initialTasks)

  const unpaidCount = useMemo(() => tasks.filter((task) => task.status === 'pending').length, [tasks])

  return (
    <PageContainer title="Invoice Detail" description="Review invoice tasks and update payment status by task.">
      <div className="invoice-layout">
        <section className="invoice-card invoice-header">
          <div>
            <h3>{invoiceId ?? 'INV-0007612'}</h3>
            <p className="card-text">Client: John Doe</p>
            <p className="card-text">Date Range: Apr 01, 2026 - Apr 24, 2026</p>
          </div>
          <div>
            <p className="card-text">Unpaid Tasks: {unpaidCount}</p>
            <p className="card-text">Total: ₹122.71</p>
          </div>
        </section>

        <section className="invoice-card invoice-table-wrap">
          <table className="invoice-table">
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
                  <td>{task.amount}</td>
                  <td>
                    <select
                      className="invoice-status-select"
                      value={task.status}
                      onChange={(event) => {
                        const nextStatus = event.target.value as TaskStatus
                        setTasks((prev) => prev.map((item) => (item.taskId === task.taskId ? { ...item, status: nextStatus } : item)))
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="invoice-card">
          <div className="invoice-actions">
            <button type="button" className="button button--primary">
              Save
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                setTasks((prev) => prev.map((task) => ({ ...task, status: 'paid' })))
              }}
            >
              Mark All Paid
            </button>
          </div>
        </section>
      </div>
    </PageContainer>
  )
}

export default InvoiceDetailPage
