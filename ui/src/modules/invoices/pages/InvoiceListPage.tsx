import { NavLink } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getClients, type ClientItem } from '../../clients/api/clientsApi'
import { getInvoices, type InvoiceRecord } from '../api/invoicesApi'
import { useAlert } from '../../../shared/alerts/useAlert'
import PageContainer from '../../../shared/components/PageContainer'
import '../invoices.css'

type InvoiceStatusFilter = 'all' | 'pending' | 'partial' | 'paid'

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

  const [clients, setClients] = useState<ClientItem[]>([])
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)

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
                      <NavLink
                        to={`/invoices/detail?invoiceId=${encodeURIComponent(invoice.invoice_number || String(invoice.id))}`}
                        className="button invoice-link invoice-link--spaced"
                      >
                        View
                      </NavLink>
                      <NavLink
                        to={`/invoices/detail?invoiceId=${encodeURIComponent(invoice.invoice_number || String(invoice.id))}&mode=payment`}
                        className="button invoice-link"
                      >
                        Manage Payment
                      </NavLink>
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
    </PageContainer>
  )
}

export default InvoiceListPage
