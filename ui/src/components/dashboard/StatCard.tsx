type StatCardColor = 'blue' | 'green' | 'cyan' | 'red' | 'primary'

type StatCardProps = {
  title: string
  count?: number
  changePercentage?: number | null
  color?: StatCardColor
  loading?: boolean
  icon?: string
  supportingText?: string
  compact?: boolean
}

const colorClassMap: Record<StatCardColor, string> = {
  blue: 'primary',
  green: 'success',
  cyan: 'info',
  red: 'danger',
  primary: 'primary',
}

const StatCard = ({ title, count = 0, changePercentage = null, color = 'primary', loading = false, icon, supportingText, compact = false }: StatCardProps) => {
  const variant = colorClassMap[color] ?? 'primary'

  return (
    <div className={`card border-0 shadow-sm rounded-4 h-100 stat-card-hover${compact ? ` expert-kpi expert-kpi--${variant}` : ''}`}>
      <div className="card-body p-4">
        {loading ? (
          <>
            <div className="placeholder-glow mb-3"><span className="placeholder col-7" /></div>
            <div className="placeholder-glow mb-2"><span className="placeholder col-4" /></div>
            <div className="placeholder-glow"><span className="placeholder col-5" /></div>
          </>
        ) : (
          <div className="expert-kpi__layout">
            {icon ? <span className="expert-kpi__icon" aria-hidden="true">{icon}</span> : null}
            <div className="expert-kpi__content"><p className="text-secondary fw-semibold mb-2">{title}</p>
            <h3 className={`mb-1 text-${variant}`}>{count}</h3>
            {supportingText ? <span className="expert-kpi__support">{supportingText}</span> : null}
            {typeof changePercentage === 'number' && (
              <small className={changePercentage >= 0 ? 'text-success' : 'text-danger'}>
                {changePercentage >= 0 ? '▲' : '▼'} {Math.abs(changePercentage)}% vs previous period
              </small>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard
