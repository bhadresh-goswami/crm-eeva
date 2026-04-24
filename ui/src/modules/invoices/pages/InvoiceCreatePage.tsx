import { useEffect, useMemo, useState } from 'react'
import { getClients, type ClientItem } from '../../clients/api/clientsApi'
import { createInvoice, getCompletedTasks, getNextInvoiceNumber, type CompletedTask } from '../api/invoicesApi'
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

const InvoiceCreatePage = () => {
  const { showToast } = useAlert()

  const [clients, setClients] = useState<ClientItem[]>([])
  const [clientId, setClientId] = useState<number | null>(null)
  const [fromDate, setFromDate] = useState('2026-04-01')
  const [toDate, setToDate] = useState('2026-04-24')
  const [currency, setCurrency] = useState('INR')
  const [notes, setNotes] = useState('')

  const [fromCompany, setFromCompany] = useState('')
  const [toCompany, setToCompany] = useState('')

  const [invoiceNumber, setInvoiceNumber] = useState('')
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
    const loadInitial = async () => {
      try {
        const [clientsData, nextInvoice] = await Promise.all([getClients(), getNextInvoiceNumber()])
        setClients(clientsData)
        if (clientsData.length > 0) {
          setClientId(clientsData[0].id)
          setToCompany(clientsData[0].company_name || clientsData[0].name)
        }
        if (nextInvoice) {
          setInvoiceNumber(nextInvoice)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load invoice defaults.'
        showToast({ type: 'error', message })
      }
    }

    void loadInitial()
  }, [showToast])

  useEffect(() => {
    const selected = clients.find((client) => client.id === clientId)
    setToCompany(selected?.company_name || selected?.name || '')
  }, [clientId, clients])

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
      if (!response.ok) throw new Error()
      const payload = (await response.json()) as { rates?: Record<string, number> }
      const nextRate = payload.rates?.[targetCurrency]
      if (!nextRate || !Number.isFinite(nextRate)) throw new Error()
      setRate(nextRate)
    } catch {
      setRate(FALLBACK_RATE[targetCurrency] ?? 1)
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
  const total = subtotal + tds

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
      const tasks = await getCompletedTasks({ client_id: clientId, from_date: fromDate, to_date: toDate })

      const grouped = tasks.reduce<Record<string, GroupedLineItem>>((acc, task) => {
        const key = task.support_type || 'Support'
        if (!acc[key]) {
          acc[key] = { supportType: key, qty: 1, amountInInr: task.amount, taskIds: [task.task_id] }
        } else {
          acc[key].qty += 1
          acc[key].amountInInr += task.amount
          acc[key].taskIds.push(task.task_id)
        }
        return acc
      }, {})

      const nextLineItems = Object.values(grouped)
      setLoadedTasks(tasks)
      setLineItems(nextLineItems)
      setLoadMessage(nextLineItems.length ? `${nextLineItems.length} line item(s) loaded from completed tasks.` : 'No completed tasks available for invoicing')
    } catch (error) {
      setLineItems([])
      setLoadedTasks([])
      setLoadMessage(error instanceof Error ? error.message : 'Failed to load completed tasks.')
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
        grouped_items: lineItems.map((row) => ({ support_type: row.supportType, qty: row.qty, amount: row.amountInInr * rate, task_ids: row.taskIds })),
        items: loadedTasks.map((task) => ({ task_id: task.task_id, qty: 1, support_type: task.support_type, amount: task.amount * rate, status: 'pending' })),
      })

      showToast({ type: 'success', message: 'Invoice saved successfully.' })
      setLineItems([])
      setLoadedTasks([])
      setLoadMessage('Invoice saved. No duplicate tasks can be invoiced.')
      const nextInvoice = await getNextInvoiceNumber()
      if (nextInvoice) setInvoiceNumber(nextInvoice)
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save invoice.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PageContainer title="Create Invoice" description="Design-ready invoice form for managers and admins.">
      <div className="invoice-layout invoice-print-area">
        <section className="invoice-surface">
          <div className="invoice-toolbar-grid">
            <label className="invoice-field">
              <span className="invoice-label">Client</span>
              <select value={clientId ?? ''} onChange={(event) => setClientId(Number(event.target.value) || null)}>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company_name || client.name}
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
          <h1 className="invoice-doc-title">Invoice</h1>
          <div className="invoice-meta-grid">
            <div className="invoice-party-grid">
              <div className="invoice-party-block">
                <h3 className="invoice-subtitle">From</h3>
                <input value={fromCompany} onChange={(event) => setFromCompany(event.target.value)} placeholder="Enter company name" />
                <p className="invoice-party-text">Email: Sharmakishank9@gmail.com</p>
                <p className="invoice-party-text">Phone: +91 9079018767</p>
              </div>

              <div className="invoice-party-block">
                <h3 className="invoice-subtitle">To</h3>
                <input value={toCompany} readOnly />
              </div>
            </div>

            <div className="invoice-dates-grid">
              <label className="invoice-field">
                <span className="invoice-label">Invoice #</span>
                <input value={invoiceNumber} readOnly />
              </label>
              <label className="invoice-field">
                <span className="invoice-label">Invoice Date</span>
                <input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
              </label>
              <label className="invoice-field">
                <span className="invoice-label">Payment Due Date</span>
                <input type="date" value={paymentDueDate} onChange={(event) => setPaymentDueDate(event.target.value)} />
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
                  <td colSpan={3} className="invoice-empty-row">No completed tasks available for invoicing</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="invoice-footer-grid">
            <label className="invoice-field">
              <span className="invoice-label">Additional Notes (Optional)</span>
              <textarea className="invoice-notes" value={notes} maxLength={500} onChange={(event) => setNotes(event.target.value)} placeholder="Add notes..." />
              <small className="invoice-char-count">{notes.length}/500 characters</small>
            </label>

            <div className="invoice-totals-box" aria-live="polite">
              <div className="invoice-total-row"><span>Subtotal</span><span>{formatCurrency(subtotal, currency)}</span></div>
              <div className="invoice-total-row"><span>TDS (2%)</span><span>-{formatCurrency(tds, currency)}</span></div>
              <div className="invoice-total-row invoice-total-row--strong"><span>Total Amount Due</span><span>{formatCurrency(total, currency)}</span></div>
            </div>
          </div>

          <div className="invoice-signature-box" aria-label="Signature box" />

          <div className="invoice-actions">
            <button type="button" className="button" onClick={() => {
              window.print()
            }}>Print</button>
            <button type="button" className="button" disabled={!lineItems.length} onClick={() => {
              const escapePdfText = (value: string) => value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
              const rows = lineItems.map((row) => `${row.qty} | ${row.supportType} | ${formatCurrency(row.amountInInr * rate, currency)}`)
              const lines = [
                'Invoice',
                `Invoice #: ${invoiceNumber}`,
                `Client: ${toCompany || '-'}`,
                `Date: ${invoiceDate}`,
                '',
                'Qty | Support Type | Amount',
                ...rows,
                '',
                `Subtotal: ${formatCurrency(subtotal, currency)}`,
                `TDS (2%): ${formatCurrency(tds, currency)}`,
                `Total: ${formatCurrency(total, currency)}`
              ]

              const content = ['BT', '/F1 12 Tf', '36 800 Td']
              lines.forEach((line, index) => {
                if (index > 0) content.push('0 -16 Td')
                content.push(`(${escapePdfText(line)}) Tj`)
              })
              content.push('ET')

              const stream = content.join('\n')
              const objects = [
                '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
                '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
                '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
                '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
                `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
              ]

              let pdf = '%PDF-1.4\n'
              const offsets: number[] = []
              objects.forEach((obj) => {
                offsets.push(pdf.length)
                pdf += `${obj}\n`
              })
              const xrefStart = pdf.length
              pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
              offsets.forEach((offset) => {
                pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
              })
              pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

              const blob = new Blob([pdf], { type: 'application/pdf' })
              const url = URL.createObjectURL(blob)
              const anchor = document.createElement('a')
              anchor.href = url
              anchor.download = `${invoiceNumber || 'invoice'}.pdf`
              anchor.click()
              URL.revokeObjectURL(url)
            }}>Generate PDF</button>
            <button type="button" className="button button--primary" disabled={!lineItems.length || isSaving} onClick={() => void onSaveInvoice()}>{isSaving ? 'Saving…' : 'Save Invoice'}</button>
          </div>
        </section>
      </div>
    </PageContainer>
  )
}

export default InvoiceCreatePage
