const ExpertReportsFilterCard = ({ filters, onChange, onApply, onReset, loading }) => (
  <div className="card shadow-sm mb-4">
    <div className="card-body p-4">
      <div className="row g-2 align-items-end">
        <div className="col-12 col-md-4">
          <label className="form-label mb-1">Search</label>
          <input className="form-control" placeholder="Search candidate, type, status..." value={filters.search} onChange={(e) => onChange('search', e.target.value)} />
        </div>
        <div className="col-12 col-md-3"><label className="form-label mb-1">Date From</label><input type="date" className="form-control" value={filters.date_from} onChange={(e) => onChange('date_from', e.target.value)} /></div>
        <div className="col-12 col-md-3"><label className="form-label mb-1">Date To</label><input type="date" className="form-control" value={filters.date_to} onChange={(e) => onChange('date_to', e.target.value)} /></div>
        <div className="col-12 col-md-2 d-grid gap-2">
          <button type="button" className="btn btn-primary" onClick={onApply} disabled={loading}>Apply Filter</button>
          <button type="button" className="btn btn-outline-secondary" onClick={onReset} disabled={loading}>Reset</button>
        </div>
      </div>
    </div>
  </div>
)

export default ExpertReportsFilterCard
