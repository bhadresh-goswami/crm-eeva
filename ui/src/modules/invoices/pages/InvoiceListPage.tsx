import { NavLink } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getClients, type ClientItem } from '../../clients/api/clientsApi'
import { getInvoiceById, getInvoices, recalculateInvoice, type InvoiceDetailRecord, type InvoiceRecord } from '../api/invoicesApi'
import { useAlert } from '../../../shared/alerts/useAlert'
import PageContainer from '../../../shared/components/PageContainer'
import '../invoices.css'

type InvoiceStatusFilter = 'all' | 'pending' | 'partial' | 'paid'

type GroupedPreviewItem = {
  support_type: string
  qty: number
  amount: number
}

const statuses: Array<{ label: string; value: InvoiceStatusFilter }> = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Partial', value: 'partial' },
  { label: 'Paid', value: 'paid' },
]

const formatDate = (value: string) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

const formatMoney = (value: number) => `₹${value.toFixed(2)}`

const getStatusLabel = (status: string) => {
  if (status === 'paid') return 'Paid'
  if (status === 'partial') return 'Partial'
  return 'Pending'
}

const getStatusClass = (status: string) => {
  if (status === 'paid') return 'invoice-badge invoice-badge--paid'
  if (status === 'partial') return 'invoice-badge invoice-badge--partial'
  return 'invoice-badge invoice-badge--pending'
}

const InvoiceListPage = () => {
  const { showToast } = useAlert()
  const invoicePrintRef = useRef<HTMLDivElement | null>(null)

  const [clients, setClients] = useState<ClientItem[]>([])
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetailRecord | null>(null)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const [recalculatingInvoiceId, setRecalculatingInvoiceId] = useState<number | null>(null)

  const [clientFilter, setClientFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>('all')
  const [invoiceNumberFilter, setInvoiceNumberFilter] = useState('')

  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await getClients()
        setClients(data)
      } catch {
        setClients([])
      }
    }

    void loadClients()
  }, [])

  useEffect(() => {
    const loadInvoices = async () => {
      setIsLoading(true)
      try {
        const data = await getInvoices({
          client_id: clientFilter === 'all' ? undefined : Number(clientFilter),
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          invoice_number: invoiceNumberFilter.trim() || undefined,
        })

        setInvoices(data)
      } catch (error) {
        setInvoices([])
        const message = error instanceof Error ? error.message : 'Failed to load invoices.'
        showToast({ type: 'error', message })
      } finally {
        setIsLoading(false)
      }
    }

    void loadInvoices()
  }, [clientFilter, fromDate, toDate, statusFilter, invoiceNumberFilter, showToast])

  const clientLabelById = useMemo(() => {
    return clients.reduce<Map<number, string>>((map, client) => {
      map.set(client.id, client.company_name || client.name)
      return map
    }, new Map())
  }, [clients])

  const previewRows = useMemo<GroupedPreviewItem[]>(() => {
    if (!selectedInvoice) return []

    const grouped = selectedInvoice.items.reduce<Record<string, GroupedPreviewItem>>((acc, item) => {
      const key = item.support_type || 'Support'
      if (!acc[key]) {
        acc[key] = { support_type: key, qty: 1, amount: item.amount }
      } else {
        acc[key].qty += 1
        acc[key].amount += item.amount
      }
      return acc
    }, {})

    return Object.values(grouped)
  }, [selectedInvoice])

  const subtotal = useMemo(() => previewRows.reduce((sum, row) => sum + row.amount, 0), [previewRows])
  const tds = useMemo(() => subtotal * 0.02, [subtotal])
  const totalAmount = useMemo(() => selectedInvoice?.total_amount ?? subtotal + tds, [selectedInvoice, subtotal, tds])

  const openViewPopup = async (invoiceId: number) => {
    setIsViewLoading(true)
    try {
      const detail = await getInvoiceById(invoiceId)
      setSelectedInvoice(detail)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load invoice details.'
      showToast({ type: 'error', message })
    } finally {
      setIsViewLoading(false)
    }
  }

  const onRecalculate = async (invoiceId: number) => {
    setRecalculatingInvoiceId(invoiceId)
    try {
      await recalculateInvoice(invoiceId)
      showToast({ type: 'success', message: 'Invoice recalculated successfully.' })
      const data = await getInvoices({
        client_id: clientFilter === 'all' ? undefined : Number(clientFilter),
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        invoice_number: invoiceNumberFilter.trim() || undefined,
      })
      setInvoices(data)
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to recalculate invoice.' })
    } finally {
      setRecalculatingInvoiceId(null)
    }
  }

  const printInvoice = () => {
    window.print()
  }

  const downloadPdf = () => {
    const content = invoicePrintRef.current
    if (!content || !selectedInvoice) return

    const printWindow = window.open('', '_blank', 'width=900,height=1200')
    if (!printWindow) {
      showToast({ type: 'error', message: 'Unable to open print window. Please allow popups and try again.' })
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>invoice-${selectedInvoice.invoice_number || selectedInvoice.id}.pdf</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; background: #fff; }
            .modal-a4 { width: 794px; min-height: 1123px; margin: 0 auto; padding: 30px; box-sizing: border-box; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border-bottom: 1px solid #d9dee6; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  return (
    <PageContainer
      title="Invoices"
      description="Track generated invoices and open each invoice for detailed management."
      actions={
        <NavLink to="/invoices/create" className="button button--primary invoice-link">
          Create Invoice
        </NavLink>
      }
    >
      <div className="invoice-layout">
        <section className="invoice-surface">
          <div className="invoice-toolbar-grid invoice-toolbar-grid--list">
            <label className="invoice-field">
              <span className="invoice-label">Client</span>
              <select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
                <option value="all">All Clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company_name || client.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="invoice-field">
              <span className="invoice-label">Date range</span>
              <div className="invoice-date-range">
                <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="From date filter" />
                <span className="invoice-date-sep">to</span>
                <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="To date filter" />
              </div>
            </div>

            <label className="invoice-field">
              <span className="invoice-label">Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as InvoiceStatusFilter)}>
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="invoice-field">
              <span className="invoice-label">Invoice number</span>
              <input
                type="text"
                value={invoiceNumberFilter}
                onChange={(event) => setInvoiceNumberFilter(event.target.value)}
                placeholder="INV-0007612"
              />
            </label>
          </div>
        </section>

        <section className="invoice-surface invoice-table-shell">
          <table className="invoice-grid-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Date Range</th>
                <th>Total</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="invoice-empty-row">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length ? (
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoice_number || `#${invoice.id}`}</td>
                    <td>{invoice.company_name || invoice.client_name || clientLabelById.get(invoice.client_id) || '-'}</td>
                    <td>
                      {formatDate(invoice.from_date)} - {formatDate(invoice.to_date)}
                    </td>
                    <td>{formatMoney(invoice.total_amount)}</td>
                    <td>
                      <span className={getStatusClass(invoice.status)}>{getStatusLabel(invoice.status)}</span>
                    </td>
                    <td>{formatDate(invoice.created_at)}</td>
                    <td>
                      <button type="button" className="button invoice-link invoice-link--spaced" onClick={() => void openViewPopup(invoice.id)} disabled={isViewLoading}>
                        View
                      </button>
                      <NavLink to={`/invoices/detail?invoiceId=${invoice.id}`} className="button invoice-link">
                        Manage Payment
                      </NavLink>
                      {invoice.status !== 'paid' ? (
                        <button
                          type="button"
                          className="button invoice-link invoice-link--spaced"
                          onClick={() => void onRecalculate(invoice.id)}
                          disabled={recalculatingInvoiceId === invoice.id}
                        >
                          {recalculatingInvoiceId === invoice.id ? 'Recalculating...' : 'Recalculate'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="invoice-empty-row">
                    No invoices found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      {selectedInvoice ? (
        <div className="invoice-modal-backdrop" role="dialog" aria-modal="true" aria-label="Invoice detail view">
          <section className="invoice-modal modal-a4-shell">
            <div className="invoice-modal-header">
              <h3>Invoice Preview</h3>
              <div className="invoice-modal-actions">
                <button type="button" className="button" onClick={downloadPdf}>Download PDF</button>
                <button type="button" className="button" onClick={printInvoice}>Print</button>
                <button type="button" className="button" onClick={() => setSelectedInvoice(null)}>Close</button>
              </div>
            </div>

            <div ref={invoicePrintRef} className="modal-a4 invoice-preview-a4">
              <header className="invoice-preview-header">
                <div>
                  <h2 className="invoice-header-title">Bsquare CRM Services</h2>
                  <p className="invoice-header-meta">From: Bsquare CRM</p>
                </div>
                <div>
                  <p className="invoice-header-meta"><strong>To:</strong> {selectedInvoice.company_name || selectedInvoice.client_name || '-'}</p>
                  <p className="invoice-header-meta"><strong>Invoice #:</strong> {selectedInvoice.invoice_number || `#${selectedInvoice.id}`}</p>
                  <p className="invoice-header-meta"><strong>Invoice Date:</strong> {formatDate(selectedInvoice.created_at)}</p>
                  <p className="invoice-header-meta"><strong>Due Date:</strong> {formatDate(selectedInvoice.to_date)}</p>
                </div>
              </header>

              <section className="invoice-table-shell">
                <table className="invoice-grid-table">
                  <thead>
                    <tr>
                      <th>Qty</th>
                      <th>Support Type</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.length ? (
                      previewRows.map((item) => (
                        <tr key={item.support_type}>
                          <td>{item.qty}</td>
                          <td>{item.support_type}</td>
                          <td>{formatMoney(item.amount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="invoice-empty-row">No line items available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>

              <section className="invoice-preview-totals">
                <p><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></p>
                <p><span>TDS (2%)</span><strong>{formatMoney(tds)}</strong></p>
                <p className="invoice-preview-total"><span>Total Amount</span><strong>{formatMoney(totalAmount)}</strong></p>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </PageContainer>
  )
}

export default InvoiceListPage
