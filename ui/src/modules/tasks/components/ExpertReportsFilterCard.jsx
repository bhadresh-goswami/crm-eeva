const ExpertReportsFilterCard = ({ filters, onChange, onApply, onReset, loading, candidateOptions = [], taskTypeOptions = [], statusOptions = [], pageSize = 20, onPageSizeChange }) => (
  <div className="card border-0 shadow-sm mb-2">
    <div className="card-body p-3">
      <div className="d-flex justify-content-between align-items-center mb-2 gap-2 flex-wrap">
        <h6 className="mb-0 fw-semibold text-dark" style={{ fontSize: '1rem' }}>Filter Reports</h6>
        <div className="d-flex align-items-center gap-2">
          <label className="form-label mb-0 text-muted fw-semibold" style={{ fontSize: '0.85rem' }}>Entries</label>
          <select className="form-select form-select-sm" style={{ minWidth: 90 }} value={pageSize} onChange={(e) => onPageSizeChange?.(Number(e.target.value))}>
            {[20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
      </div>
      <div className="row g-2 align-items-end">
        <div className="col-12 col-md-4">
          <label className="form-label fw-semibold text-muted mb-1">Candidate Name</label>
          <input list="expert-candidate-options" className="form-control" style={{ fontSize: '0.92rem' }} placeholder="Select candidate..." value={filters.candidate_name || ''} onChange={(e) => onChange('candidate_name', e.target.value)} />
          <datalist id="expert-candidate-options">{candidateOptions.map((name) => <option key={name} value={name} />)}</datalist>
        </div>
        <div className="col-12 col-md-2"><label className="form-label fw-semibold text-muted mb-1">Task Type</label><select className="form-select" style={{ fontSize: '0.92rem' }} value={filters.task_type || ''} onChange={(e) => onChange('task_type', e.target.value)}><option value="">All</option>{taskTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
        <div className="col-12 col-md-2"><label className="form-label fw-semibold text-muted mb-1">Status</label><select className="form-select" style={{ fontSize: '0.92rem' }} value={filters.status_name || ''} onChange={(e) => onChange('status_name', e.target.value)}><option value="">All</option>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
        <div className="col-12 col-md-2"><label className="form-label fw-semibold text-muted mb-1">Date From</label><input type="date" className="form-control" style={{ fontSize: '0.92rem' }} value={filters.date_from || ''} onChange={(e) => onChange('date_from', e.target.value)} /></div>
        <div className="col-12 col-md-2"><label className="form-label fw-semibold text-muted mb-1">Date To</label><input type="date" className="form-control" style={{ fontSize: '0.92rem' }} value={filters.date_to || ''} onChange={(e) => onChange('date_to', e.target.value)} /></div>
        <div className="col-12 col-md-12 d-flex justify-content-end gap-2 mt-2">
          <button type="button" className="btn btn-primary fw-semibold" style={{ fontSize: '0.88rem', padding: '0.45rem 0.75rem' }} onClick={onApply} disabled={loading}>Apply Filter</button>
          <button type="button" className="btn btn-link text-decoration-none text-secondary fw-semibold" style={{ fontSize: '0.88rem' }} onClick={onReset} disabled={loading}>Reset</button>
        </div>
      </div>
    </div>
  </div>
)

export default ExpertReportsFilterCard
