const colors = ['#0d6efd', '#198754', '#0dcaf0', '#dc3545']

const TaskRatioChart = ({ data = [], loading = false }) => {
  if (loading) return <div className="placeholder-glow"><span className="placeholder col-12" style={{ height: 220, display: 'block' }} /></div>
  const filteredData = data.filter((item) => Number(item.total ?? 0) > 0)
  if (!filteredData.length) return <p className="text-secondary mb-0">No task status ratio data available.</p>

  const total = filteredData.reduce((sum, item) => sum + Number(item.total ?? 0), 0)
  let cursor = 0
  const gradient = filteredData.map((item, idx) => {
    const value = Number(item.total ?? 0)
    const angle = total ? (value / total) * 360 : 0
    const start = cursor
    const end = cursor + angle
    cursor = end
    return `${colors[idx % colors.length]} ${start}deg ${end}deg`
  }).join(', ')

  return <div className="d-flex flex-column align-items-center gap-3"><div style={{ width: 180, height: 180, borderRadius: '50%', background: `conic-gradient(${gradient})` }} /><div className="w-100">{filteredData.map((row, idx) => <div key={row.status_name} className="d-flex justify-content-between"><span><i className="bi bi-circle-fill me-2" style={{ color: colors[idx % colors.length] }} />{row.status_name}</span><strong>{row.total}</strong></div>)}</div></div>
}

export default TaskRatioChart
