import { useEffect, useMemo, useState } from 'react'
import { getClients, type ClientItem } from '../../clients/api/clientsApi'
import { createInvoice, getCompletedTasks, type CompletedTask } from '../api/invoicesApi'
import { useAlert } from '../../../shared/alerts/useAlert'
import PageContainer from '../../../shared/components/PageContainer'
import '../invoices.css'

type GroupedLineItem = {
  supportType: string
  qty: number
  amountInInr: number
  taskIds: number[]
}

const CURRENCY_SYMBOL: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

const FALLBACK_RATE: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
}

const LIVE_RATE_API = 'https://open.er-api.com/v6/latest/INR'

const formatCurrency = (value: number, currency: string) => {
  const symbol = CURRENCY_SYMBOL[currency] ?? ''
  return `${symbol}${value.toFixed(2)}`
}

const toInputDate = (value: string) => value.slice(0, 10)

const InvoiceCreatePage = () => {
  const { showToast } = useAlert()

  const [clients, setClients] = useState<ClientItem[]>([])
  const [clientId, setClientId] = useState<number | null>(null)
  const [fromDate, setFromDate] = useState('2026-04-01')
  const [toDate, setToDate] = useState('2026-04-24')
  const [currency, setCurrency] = useState('INR')
  const [notes, setNotes] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('INV-0007612')
  const [invoiceDate, setInvoiceDate] = useState('2026-04-24')
  const [paymentDueDate, setPaymentDueDate] = useState('2026-05-01')

  const [lineItems, setLineItems] = useState<GroupedLineItem[]>([])
  const [loadedTasks, setLoadedTasks] = useState<CompletedTask[]>([])
  const [loadMessage, setLoadMessage] = useState('Load completed tasks to generate invoice line items.')
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [rate, setRate] = useState(FALLBACK_RATE.INR)
  const [rateLoading, setRateLoading] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)

  const isDateRangeValid = fromDate <= toDate

  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await getClients()
        setClients(data)
        if (!clientId && data.length > 0) {
          setClientId(data[0].id)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load clients.'
        showToast({ type: 'error', message })
      }
    }

    void loadClients()
  }, [clientId, showToast])

  const fetchLiveRate = async (targetCurrency: string) => {
    if (targetCurrency === 'INR') {
      setRate(1)
      setRateError(null)
      return
    }

    setRateLoading(true)
    setRateError(null)

    try {
      const response = await fetch(LIVE_RATE_API)
      if (!response.ok) {
        throw new Error(`Rate API failed (${response.status})`)
      }

      const payload = (await response.json()) as { rates?: Record<string, number>; time_last_update_utc?: string }
      const nextRate = payload.rates?.[targetCurrency]

      if (!nextRate || !Number.isFinite(nextRate)) {
        throw new Error('Selected currency not available from rate API.')
      }

      setRate(nextRate)
    } catch {
      const fallback = FALLBACK_RATE[targetCurrency] ?? 1
      setRate(fallback)
      setRateError(`Live rate unavailable. Using fallback rate for ${targetCurrency}.`)
    } finally {
      setRateLoading(false)
    }
  }

  useEffect(() => {
    void fetchLiveRate(currency)
  }, [currency])

  const subtotal = useMemo(() => lineItems.reduce((sum, row) => sum + row.amountInInr * rate, 0), [lineItems, rate])
  const tds = subtotal * 0.02
  const total = subtotal - tds

  const onLoadCompletedTasks = async () => {
    if (!clientId) {
      setLoadMessage('Please select a client.')
      return
    }

    if (!isDateRangeValid) {
      setLoadMessage('From Date must be earlier than or equal to To Date.')
      setLineItems([])
      setLoadedTasks([])
      return
    }

    try {
      setIsLoadingTasks(true)
      const tasks = await getCompletedTasks({
        client_id: clientId,
        from_date: fromDate,
        to_date: toDate,
      })

      const grouped = tasks.reduce<Record<string, GroupedLineItem>>((acc, task) => {
        const key = task.support_type || 'Support'
        if (!acc[key]) {
          acc[key] = { supportType: key, qty: 1, amountInInr: task.amount, taskIds: [task.id] }
        } else {
          acc[key].qty += 1
          acc[key].amountInInr += task.amount
          acc[key].taskIds.push(task.id)
        }
        return acc
      }, {})

      const nextLineItems = Object.values(grouped)
      setLoadedTasks(tasks)
      setLineItems(nextLineItems)
      setLoadMessage(nextLineItems.length ? `${nextLineItems.length} line item(s) loaded from completed tasks.` : 'No completed tasks found.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load completed tasks.'
      setLoadMessage(message)
      setLineItems([])
      setLoadedTasks([])
    } finally {
      setIsLoadingTasks(false)
    }
  }

  const onSaveInvoice = async () => {
    if (!clientId || !lineItems.length) {
      showToast({ type: 'error', message: 'Load completed tasks before saving invoice.' })
      return
    }

    try {
      setIsSaving(true)

      await createInvoice({
        client_id: clientId,
        from_date: fromDate,
        to_date: toDate,
        currency,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        payment_due_date: paymentDueDate,
        notes,
        subtotal,
        tds_amount: tds,
        total_amount: total,
        grouped_items: lineItems.map((row) => ({
          support_type: row.supportType,
          qty: row.qty,
          amount: row.amountInInr * rate,
          task_ids: row.taskIds,
        })),
        items: loadedTasks.map((task) => ({
          task_id: task.id,
          qty: 1,
          support_type: task.support_type,
          amount: task.amount * rate,
          status: 'pending',
        })),
      })

      showToast({ type: 'success', message: 'Invoice saved successfully.' })
      setLoadMessage('Invoice saved. Already invoiced tasks are now excluded from completed tasks API.')
      setLineItems([])
      setLoadedTasks([])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save invoice.'
      showToast({ type: 'error', message })
    } finally {
      setIsSaving(false)
    }
  }

  const selectedClientName = clients.find((client) => client.id === clientId)?.name ?? 'John Doe'

  return (
    <PageContainer title="Create Invoice" description="Design-ready invoice form for managers and admins.">
      <div className="invoice-layout">
        <section className="invoice-surface">
          <div className="invoice-toolbar-grid">
            <label className="invoice-field">
              <span className="invoice-label">Client</span>
              <select value={clientId ?? ''} onChange={(event) => setClientId(Number(event.target.value) || null)}>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
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
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - British Pound (£)</option>
              </select>
            </label>

            <button type="button" className="button button--primary invoice-load-btn" onClick={() => void onLoadCompletedTasks()} disabled={isLoadingTasks}>
              {isLoadingTasks ? 'Loading…' : 'Load Completed Tasks'}
            </button>
          </div>

          <div className="invoice-rate-row">
            <p className={`invoice-help-text ${isDateRangeValid ? '' : 'invoice-help-text--error'}`}>{loadMessage}</p>
            <div className="invoice-rate-info">
              <span className="invoice-help-text">Live rate: 1 INR = {formatCurrency(rate, currency)} ({currency})</span>
              <button type="button" className="button" onClick={() => void fetchLiveRate(currency)} disabled={rateLoading}>
                {rateLoading ? 'Refreshing…' : 'Refresh Rate'}
              </button>
            </div>
          </div>
          {rateError ? <p className="invoice-help-text invoice-help-text--error">{rateError}</p> : null}
        </section>

        <section className="invoice-surface">
          <div className="invoice-meta-grid">
            <div className="invoice-party-grid">
              <div className="invoice-party-block">
                <h3 className="invoice-subtitle">From</h3>
                <input value="bEdge Tech Services" readOnly aria-label="From party" />
                <p className="invoice-party-text">795 Freedom Ave, Suite 600</p>
                <p className="invoice-party-text">New York, NY 94107</p>
                <p className="invoice-party-text">Phone: (123) 123-9876</p>
                <p className="invoice-party-text">Email: contact@ironadmin.com</p>
              </div>

              <div className="invoice-party-block">
                <h3 className="invoice-subtitle">To</h3>
                <select value={clientId ?? ''} onChange={(event) => setClientId(Number(event.target.value) || null)} aria-label="Invoice recipient">
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <p className="invoice-party-text">795 Freedom Ave, Suite 600</p>
                <p className="invoice-party-text">New York, CA 94107</p>
                <p className="invoice-party-text">Phone: (123) 123-9876</p>
                <p className="invoice-party-text">Email: billing@{selectedClientName.toLowerCase().replaceAll(' ', '')}.com</p>
              </div>
            </div>

            <div className="invoice-dates-grid">
              <label className="invoice-field">
                <span className="invoice-label">Invoice #</span>
                <input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} />
              </label>
              <label className="invoice-field">
                <span className="invoice-label">Invoice Date</span>
                <input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(toInputDate(event.target.value))} />
              </label>
              <label className="invoice-field">
                <span className="invoice-label">Payment Due Date</span>
                <input type="date" value={paymentDueDate} onChange={(event) => setPaymentDueDate(toInputDate(event.target.value))} />
              </label>
            </div>
          </div>
        </section>

        <section className="invoice-surface invoice-table-shell">
          <table className="invoice-grid-table">
            <thead>
              <tr>
                <th>Qty</th>
                <th>Support Type</th>
                <th className="numeric">Amount ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length ? (
                lineItems.map((row) => (
                  <tr key={row.supportType}>
                    <td>{row.qty}</td>
                    <td>{row.supportType}</td>
                    <td className="numeric">{formatCurrency(row.amountInInr * rate, currency)}</td>
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
              <span className="invoice-label">Additional Notes (Optional)</span>
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
                <span>Total Amount Due</span>
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
            <button type="button" className="button button--primary" disabled={!lineItems.length || isSaving} onClick={() => void onSaveInvoice()}>
              {isSaving ? 'Saving…' : 'Save Invoice'}
            </button>
          </div>
        </section>
      </div>
    </PageContainer>
  )
}

export default InvoiceCreatePage
