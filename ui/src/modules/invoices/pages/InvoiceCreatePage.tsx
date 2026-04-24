import { useMemo, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import '../invoices.css'

type ClientOption = {
  id: string
  label: string
}

type TaskRecord = {
  id: string
  clientId: string
  date: string
  supportType: string
  amount: number
}

type InvoiceLineItem = {
  supportType: string
  qty: number
  amount: number
}

const clients: ClientOption[] = [
  { id: 'john-doe', label: 'John Doe' },
  { id: 'acme', label: 'Acme Industries' },
]

const completedTasks: TaskRecord[] = [
  { id: 'TASK-2001', clientId: 'john-doe', date: '2026-04-03', supportType: 'Call of Duty Support', amount: 24.5 },
  { id: 'TASK-2002', clientId: 'john-doe', date: '2026-04-08', supportType: 'Call of Duty Support', amount: 40 },
  { id: 'TASK-2003', clientId: 'john-doe', date: '2026-04-14', supportType: 'Racing Game Support', amount: 50 },
  { id: 'TASK-2004', clientId: 'john-doe', date: '2026-04-20', supportType: 'DVD Support', amount: 10.7 },
  { id: 'TASK-3001', clientId: 'acme', date: '2026-03-12', supportType: 'Movie Collection Support', amount: 302 },
]

const formatCurrency = (value: number, currency: string) => {
  if (currency === 'USD') return `$${value.toFixed(2)}`
  return `₹${value.toFixed(2)}`
}

const InvoiceCreatePage = () => {
  const [clientId, setClientId] = useState('john-doe')
  const [fromDate, setFromDate] = useState('2026-04-01')
  const [toDate, setToDate] = useState('2026-04-24')
  const [currency, setCurrency] = useState('INR')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [loadMessage, setLoadMessage] = useState('Load completed tasks to generate invoice line items.')

  const subtotal = useMemo(() => lineItems.reduce((sum, row) => sum + row.amount, 0), [lineItems])
  const tds = subtotal * 0.02
  const total = subtotal - tds

  const isDateRangeValid = fromDate <= toDate

  const onLoadCompletedTasks = () => {
    if (!isDateRangeValid) {
      setLoadMessage('From Date must be earlier than or equal to To Date.')
      setLineItems([])
      return
    }

    const grouped = completedTasks
      .filter((task) => task.clientId === clientId && task.date >= fromDate && task.date <= toDate)
      .reduce<Record<string, InvoiceLineItem>>((acc, task) => {
        const existing = acc[task.supportType]
        if (!existing) {
          acc[task.supportType] = { supportType: task.supportType, qty: 1, amount: task.amount }
        } else {
          existing.qty += 1
          existing.amount += task.amount
        }
        return acc
      }, {})

    const nextItems = Object.values(grouped)
    setLineItems(nextItems)
    setLoadMessage(nextItems.length ? `${nextItems.length} line item(s) loaded from completed tasks.` : 'No completed tasks found for this client/date range.')
  }

  return (
    <PageContainer title="Create Invoice" description="Design-ready invoice form for managers and admins.">
      <div className="invoice-layout">
        <section className="invoice-surface">
          <div className="invoice-toolbar-grid">
            <label className="invoice-field">
              <span className="invoice-label">Client</span>
              <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="invoice-field">
              <span className="invoice-label">From Date</span>
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </label>

            <label className="invoice-field">
              <span className="invoice-label">To Date</span>
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </label>

            <label className="invoice-field">
              <span className="invoice-label">Currency</span>
              <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                <option value="INR">INR - Indian Rupee (₹)</option>
                <option value="USD">USD - US Dollar ($)</option>
              </select>
            </label>

            <button type="button" className="button button--primary invoice-load-btn" onClick={onLoadCompletedTasks}>
              Load Completed Tasks
            </button>
          </div>
          <p className={`invoice-help-text ${isDateRangeValid ? '' : 'invoice-help-text--error'}`}>{loadMessage}</p>
        </section>

        <section className="invoice-surface invoice-table-shell">
          <table className="invoice-grid-table">
            <thead>
              <tr>
                <th>Qty</th>
                <th>Support Type</th>
                <th className="numeric">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length ? (
                lineItems.map((row) => (
                  <tr key={row.supportType}>
                    <td>{row.qty}</td>
                    <td>{row.supportType}</td>
                    <td className="numeric">{formatCurrency(row.amount, currency)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="invoice-empty-row">
                    No line items loaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="invoice-footer-grid">
            <label className="invoice-field">
              <span className="invoice-label">Notes</span>
              <textarea
                className="invoice-notes"
                value={notes}
                maxLength={500}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add notes, terms or special instructions for this invoice."
              />
              <small className="invoice-char-count">{notes.length}/500 characters</small>
            </label>

            <div className="invoice-totals-box" aria-live="polite">
              <div className="invoice-total-row">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="invoice-total-row">
                <span>TDS (2%)</span>
                <span>-{formatCurrency(tds, currency)}</span>
              </div>
              <div className="invoice-total-row invoice-total-row--strong">
                <span>Total</span>
                <span>{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </div>

          <div className="invoice-actions">
            <button type="button" className="button" onClick={() => window.print()}>
              Print
            </button>
            <button type="button" className="button" disabled={!lineItems.length}>
              Generate PDF
            </button>
            <button type="button" className="button button--primary" disabled={!lineItems.length}>
              Save Invoice
            </button>
          </div>
        </section>
      </div>
    </PageContainer>
  )
}

export default InvoiceCreatePage
