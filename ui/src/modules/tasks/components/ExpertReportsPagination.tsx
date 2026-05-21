type Props = {
  page: number
  totalPages: number
  totalRecords: number
  perPage: number
  onPageChange: (page: number) => void
}

const ExpertReportsPagination = ({ page, totalPages, totalRecords, perPage, onPageChange }: Props) => {
  if (totalPages <= 1) return null
  const start = totalRecords === 0 ? 0 : ((page - 1) * perPage) + 1
  const end = Math.min(page * perPage, totalRecords)
  const from = Math.max(1, page - 2)
  const to = Math.min(totalPages, from + 4)
  return (
    <nav className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2" aria-label="Reports pagination">
      <div className="text-muted">Showing {start} to {end} of {totalRecords} entries</div>
      <ul className="pagination mb-0">
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => onPageChange(1)}>&laquo;</button></li>
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => onPageChange(page - 1)}>&lsaquo;</button></li>
        {Array.from({ length: (to - from) + 1 }, (_, idx) => from + idx).map((p) => (
          <li key={p} className={`page-item ${p === page ? 'active' : ''}`}><button className="page-link" onClick={() => onPageChange(p)}>{p}</button></li>
        ))}
        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}><button className="page-link" onClick={() => onPageChange(page + 1)}>&rsaquo;</button></li>
        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}><button className="page-link" onClick={() => onPageChange(totalPages)}>&raquo;</button></li>
      </ul>
    </nav>
  )
}

export default ExpertReportsPagination
