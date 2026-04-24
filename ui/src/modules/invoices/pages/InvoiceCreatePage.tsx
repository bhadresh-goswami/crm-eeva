import PageContainer from '../../../shared/components/PageContainer'
import '../invoices.css'

const rows = [
  { id: 1, qty: 3, supportType: 'Call of Duty Support', amount: 64.5 },
  { id: 2, qty: 2, supportType: 'Racing Game Support', amount: 50 },
  { id: 3, qty: 1, supportType: 'DVD Support', amount: 10.7 },
]

const subtotal = rows.reduce((sum, row) => sum + row.amount, 0)
const tds = subtotal * 0.02
const total = subtotal - tds

const formatCurrency = (value: number) => `₹${value.toFixed(2)}`

const InvoiceCreatePage = () => {
  return (
    <PageContainer title="Create Invoice" description="Create invoices from completed tasks for a selected client and date range.">
      <div className="invoice-layout">
        <section className="invoice-card">
          <div className="invoice-form-grid">
            <label className="auth-card__field">
              Client
              <select defaultValue="john-doe">
                <option value="john-doe">John Doe</option>
                <option value="acme">Acme Industries</option>
              </select>
            </label>

            <label className="auth-card__field">
              From Date
              <input type="date" defaultValue="2026-04-01" />
            </label>

            <label className="auth-card__field">
              To Date
              <input type="date" defaultValue="2026-04-24" />
            </label>

            <label className="auth-card__field">
              Currency
              <select defaultValue="INR">
                <option value="INR">INR - Indian Rupee (₹)</option>
                <option value="USD">USD - US Dollar ($)</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <button type="button" className="button button--primary">
              Load Completed Tasks
            </button>
          </div>
        </section>

        <section className="invoice-card invoice-table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Qty</th>
                <th>Support Type</th>
                <th className="numeric">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.qty}</td>
                  <td>{row.supportType}</td>
                  <td className="numeric">{formatCurrency(row.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Subtotal</td>
                <td className="numeric">{formatCurrency(subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={2}>TDS (2%)</td>
                <td className="numeric">-{formatCurrency(tds)}</td>
              </tr>
              <tr>
                <td colSpan={2}>Total</td>
                <td className="numeric">{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="invoice-card">
          <label className="auth-card__field">
            Notes
            <textarea className="invoice-notes" placeholder="Add notes, terms or special instructions for this invoice." />
          </label>

          <div className="invoice-actions">
            <button type="button" className="button">
              Generate PDF
            </button>
            <button type="button" className="button">
              Print
            </button>
            <button type="button" className="button button--primary">
              Save Invoice
            </button>
          </div>
        </section>
      </div>
    </PageContainer>
  )
}

export default InvoiceCreatePage
