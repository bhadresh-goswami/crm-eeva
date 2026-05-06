type Filters = {
  search: string
  date_from: string
  date_to: string
}

type Props = {
  filters: Filters
  onChange: (key: keyof Filters, value: string) => void
  onApply: () => void
  onReset: () => void
  loading: boolean
}

const ExpertReportsFilterCard = ({ filters, onChange, onApply, onReset, loading }: Props) => (
  <div className="card border-0 shadow-sm mb-3">
    <div className="card-body p-3 p-md-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0 fw-semibold text-dark">Filter Reports</h6>
        <small className="text-muted">Use search/date to narrow results</small>
      </div>
      <div className="row g-3 align-items-end">
        <div className="col-12 col-md-4">
          <label className="form-label fw-semibold small text-uppercase text-muted mb-1">Search</label>
          <input className="form-control form-control-lg" style={{ fontSize: '0.98rem' }} placeholder="Search candidate, type, status..." value={filters.search} onChange={(e) => onChange('search', e.target.value)} />
        </div>
        <div className="col-12 col-md-3"><label className="form-label fw-semibold small text-uppercase text-muted mb-1">Date From</label><input type="date" className="form-control form-control-lg" style={{ fontSize: '0.98rem' }} value={filters.date_from} onChange={(e) => onChange('date_from', e.target.value)} /></div>
        <div className="col-12 col-md-3"><label className="form-label fw-semibold small text-uppercase text-muted mb-1">Date To</label><input type="date" className="form-control form-control-lg" style={{ fontSize: '0.98rem' }} value={filters.date_to} onChange={(e) => onChange('date_to', e.target.value)} /></div>
        <div className="col-12 col-md-2 d-grid gap-2">
          <button type="button" className="btn btn-primary btn-lg fw-semibold" style={{ fontSize: '1rem' }} onClick={onApply} disabled={loading}>Apply Filter</button>
          <button type="button" className="btn btn-link text-decoration-none text-secondary fw-semibold" style={{ fontSize: '1rem' }} onClick={onReset} disabled={loading}>Reset</button>
        </div>
      </div>
    </div>
  </div>
)

export default ExpertReportsFilterCard
