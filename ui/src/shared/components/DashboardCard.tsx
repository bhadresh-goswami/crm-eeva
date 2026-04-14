type DashboardCardProps = {
  title: string
  value: string | number
  trend?: number
  onClick?: () => void
}

const DashboardCard = ({ title, value, trend = 0, onClick }: DashboardCardProps) => {
  const trendClass = trend >= 0 ? 'trend up' : 'trend down'
  const trendPrefix = trend >= 0 ? '+' : ''
  const content = (
    <>
      <span className="metric-card__title">{title}</span>
      <h3 className="metric-card__value">{value}</h3>
      <p className={trendClass}>{trend >= 0 ? '↑' : '↓'} {trendPrefix}{trend}%</p>
    </>
  )

  if (onClick) {
    return (
      <button type="button" className="card metric-card metric-card--button" onClick={onClick}>
        {content}
      </button>
    )
  }

  return <article className="card metric-card">{content}</article>
}

export default DashboardCard
