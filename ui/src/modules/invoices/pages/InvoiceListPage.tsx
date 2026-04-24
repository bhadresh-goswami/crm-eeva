import { NavLink } from 'react-router-dom'
import PageContainer from '../../../shared/components/PageContainer'
import '../invoices.css'

const invoices = [
  { id: 'INV-0007612', client: 'John Doe', range: 'Apr 01, 2026 - Apr 24, 2026', total: '₹122.71', status: 'Partially Paid' },
  { id: 'INV-0007611', client: 'Acme Industries', range: 'Mar 01, 2026 - Mar 31, 2026', total: '₹302.00', status: 'Paid' },
]

const InvoiceListPage = () => {
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
        <section className="invoice-card">
          <div className="invoice-filter-grid">
            <label className="auth-card__field">
              Client
              <select>
                <option>All Clients</option>
                <option>John Doe</option>
                <option>Acme Industries</option>
              </select>
            </label>

            <label className="auth-card__field">
              Date range
              <input type="text" placeholder="2026-04-01 to 2026-04-24" />
            </label>

            <label className="auth-card__field">
              Status
              <select>
                <option>All Statuses</option>
                <option>Draft</option>
                <option>Partially Paid</option>
                <option>Paid</option>
              </select>
            </label>

            <label className="auth-card__field">
              Invoice number
              <input type="text" placeholder="INV-0007612" />
            </label>
          </div>
        </section>

        <section className="invoice-card invoice-table-wrap">
          <table className="invoice-table">
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
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.id}</td>
                  <td>{invoice.client}</td>
                  <td>{invoice.range}</td>
                  <td>{invoice.total}</td>
                  <td>
                    <span className="invoice-badge">{invoice.status}</span>
                  </td>
                  <td>
                    <NavLink to={`/invoices/${invoice.id}`} className="button invoice-link invoice-link--spaced">
                      View
                    </NavLink>
                    <NavLink to={`/invoices/${invoice.id}`} className="button invoice-link">
                      Manage
                    </NavLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </PageContainer>
  )
}

export default InvoiceListPage
