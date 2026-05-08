const WorkingHoursChart = ({ data = [], loading = false }) => {
  if (loading) return <div className="placeholder-glow"><span className="placeholder col-12" style={{ height: 280, display: 'block' }} /></div>
  if (!data.length) return <p className="text-secondary mb-0">No working hours data found in last 30 days.</p>

  const values = data.map((row) => Number(row.worked_hours ?? 0))
  const max = Math.max(...values, 8)
  const average = values.reduce((sum, v) => sum + v, 0) / values.length

  return (
    <div>
      <div className="d-flex align-items-end gap-2" style={{ minHeight: 220 }}>
        {data.map((row, idx) => {
          const hours = Number(row.worked_hours ?? 0)
          const height = Math.max((hours / max) * 180, 10)
          return (
            <div key={`${row.date}-${idx}`} className="text-center flex-fill">
              <div className="rounded-3 mx-auto" title={`${hours} hrs`} style={{ width: '100%', maxWidth: 26, height, background: hours < 8 ? '#f8d7da' : 'linear-gradient(180deg,#0d6efd,#7ab8ff)' }} />
              <small className="text-secondary d-block mt-2" style={{ fontSize: 11 }}>{row.date.slice(5)}</small>
            </div>
          )
        })}
      </div>
      <div className="mt-3 d-flex gap-3"><small className="text-success">Average: {average.toFixed(2)} hrs</small><small className="text-danger">Below 8 hrs highlighted</small></div>
    </div>
  )
}

export default WorkingHoursChart
