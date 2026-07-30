type StatCardColor = 'blue' | 'green' | 'cyan' | 'red' | 'primary'

type StatCardProps = {
  title: string
  count?: number
  changePercentage?: number | null
  color?: StatCardColor
  loading?: boolean
}

const colorClassMap: Record<StatCardColor, string> = {
  blue: 'primary',
  green: 'success',
  cyan: 'info',
  red: 'danger',
  primary: 'primary',
}

const StatCard = ({ title, count = 0, changePercentage = null, color = 'primary', loading = false }: StatCardProps) => {
  const variant = colorClassMap[color] ?? 'primary'

  return (
    <div className="card border-0 shadow-sm rounded-4 h-100 stat-card-hover">
      <div className="card-body p-4">
        {loading ? (
          <>
            <div className="placeholder-glow mb-3"><span className="placeholder col-7" /></div>
            <div className="placeholder-glow mb-2"><span className="placeholder col-4" /></div>
            <div className="placeholder-glow"><span className="placeholder col-5" /></div>
          </>
        ) : (
          <>
            <p className="text-secondary fw-semibold mb-2">{title}</p>
            <h3 className={`mb-1 text-${variant}`}>{count}</h3>
            {typeof changePercentage === 'number' && (
              <small className={changePercentage >= 0 ? 'text-success' : 'text-danger'}>
                {changePercentage >= 0 ? '▲' : '▼'} {Math.abs(changePercentage)}% vs previous period
              </small>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default StatCard
