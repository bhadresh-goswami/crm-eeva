const ExpertReportsPagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null
  return (
    <nav className="d-flex justify-content-center mt-3" aria-label="Reports pagination">
      <ul className="pagination mb-0">
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => onPageChange(page - 1)}>Previous</button></li>
        {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
          <li key={p} className={`page-item ${p === page ? 'active' : ''}`}><button className="page-link" onClick={() => onPageChange(p)}>{p}</button></li>
        ))}
        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}><button className="page-link" onClick={() => onPageChange(page + 1)}>Next</button></li>
      </ul>
    </nav>
  )
}

export default ExpertReportsPagination
