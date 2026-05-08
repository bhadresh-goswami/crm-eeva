const ExpertReportsFilterCard = ({ filters, onChange, onApply, onReset, loading }) => (
  <div className="card border-0 shadow-sm mb-2">
    <div className="card-body p-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0 fw-semibold text-dark" style={{ fontSize: '1rem' }}>Filter Reports</h6>
      </div>
      <div className="row g-2 align-items-end">
        <div className="col-12 col-md-4">
          <label className="form-label fw-semibold text-muted mb-1">Search</label>
          <input className="form-control" style={{ fontSize: '0.92rem' }} placeholder="Search candidate, type, status..." value={filters.search} onChange={(e) => onChange('search', e.target.value)} />
        </div>
        <div className="col-12 col-md-3"><label className="form-label fw-semibold text-muted mb-1">Date From</label><input type="date" className="form-control" style={{ fontSize: '0.92rem' }} value={filters.date_from} onChange={(e) => onChange('date_from', e.target.value)} /></div>
        <div className="col-12 col-md-3"><label className="form-label fw-semibold text-muted mb-1">Date To</label><input type="date" className="form-control" style={{ fontSize: '0.92rem' }} value={filters.date_to} onChange={(e) => onChange('date_to', e.target.value)} /></div>
        <div className="col-12 col-md-2 d-grid gap-2">
          <button type="button" className="btn btn-primary fw-semibold" style={{ fontSize: '0.88rem', padding: '0.45rem 0.75rem' }} onClick={onApply} disabled={loading}>Apply Filter</button>
          <button type="button" className="btn btn-link text-decoration-none text-secondary fw-semibold" style={{ fontSize: '0.88rem' }} onClick={onReset} disabled={loading}>Reset</button>
        </div>
      </div>
    </div>
  </div>
)

export default ExpertReportsFilterCard
