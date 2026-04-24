import { NavLink } from 'react-router-dom'
import { useMemo, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import '../invoices.css'

type InvoiceStatus = 'Draft' | 'Partially Paid' | 'Paid'

type InvoiceRecord = {
  id: string
  client: string
  clientId: string
  fromDate: string
  toDate: string
  total: number
  status: InvoiceStatus
}

const invoiceData: InvoiceRecord[] = [
  { id: 'INV-0007612', client: 'John Doe', clientId: 'john-doe', fromDate: '2026-04-01', toDate: '2026-04-24', total: 122.71, status: 'Partially Paid' },
  { id: 'INV-0007611', client: 'Acme Industries', clientId: 'acme', fromDate: '2026-03-01', toDate: '2026-03-31', total: 302, status: 'Paid' },
  { id: 'INV-0007610', client: 'John Doe', clientId: 'john-doe', fromDate: '2026-02-01', toDate: '2026-02-28', total: 94.5, status: 'Draft' },
]

const clients = [
  { id: 'all', label: 'All Clients' },
  { id: 'john-doe', label: 'John Doe' },
  { id: 'acme', label: 'Acme Industries' },
]

const statuses = ['All Statuses', 'Draft', 'Partially Paid', 'Paid']

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })

const InvoiceListPage = () => {
  const [clientFilter, setClientFilter] = useState('all')
  const [fromDate, setFromDate] = useState('2026-03-01')
  const [toDate, setToDate] = useState('2026-04-24')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [invoiceNumberFilter, setInvoiceNumberFilter] = useState('')

  const filteredInvoices = useMemo(() => {
    return invoiceData.filter((invoice) => {
      if (clientFilter !== 'all' && invoice.clientId !== clientFilter) return false
      if (statusFilter !== 'All Statuses' && invoice.status !== statusFilter) return false
      if (invoiceNumberFilter.trim() && !invoice.id.toLowerCase().includes(invoiceNumberFilter.trim().toLowerCase())) return false
      if (fromDate && invoice.toDate < fromDate) return false
      if (toDate && invoice.fromDate > toDate) return false
      return true
    })
  }, [clientFilter, fromDate, invoiceNumberFilter, statusFilter, toDate])

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
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.label}
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
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length ? (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.id}</td>
                    <td>{invoice.client}</td>
                    <td>
                      {formatDate(invoice.fromDate)} - {formatDate(invoice.toDate)}
                    </td>
                    <td>₹{invoice.total.toFixed(2)}</td>
                    <td>
                      <span className="invoice-badge">{invoice.status}</span>
                    </td>
                    <td>
                      <NavLink to={`/invoices/detail?invoiceId=${encodeURIComponent(invoice.id)}`} className="button invoice-link invoice-link--spaced">
                        View
                      </NavLink>
                      <NavLink to={`/invoices/detail?invoiceId=${encodeURIComponent(invoice.id)}`} className="button invoice-link">
                        Manage
                      </NavLink>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="invoice-empty-row">
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
