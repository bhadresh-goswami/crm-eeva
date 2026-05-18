import type { ReactNode } from 'react'

type KPIStatCardProps = {
  title: string
  value: string | number
  helperText: string
  icon: ReactNode
  accent: 'success' | 'warning' | 'danger' | 'primary' | 'info'
  onClick?: () => void
}

const KPIStatCard = ({ title, value, helperText, icon, accent, onClick }: KPIStatCardProps) => {
  const content = (
    <>
      <div className="kpi-card__head">
        <span className={`kpi-card__icon kpi-card__icon--${accent}`}>{icon}</span>
        <span className="kpi-card__title">{title}</span>
      </div>
      <h3 className="kpi-card__value">{value}</h3>
      <p className="kpi-card__helper">{helperText}</p>
    </>
  )

  if (onClick) {
    return <button type="button" className={`kpi-card kpi-card--${accent}`} onClick={onClick}>{content}</button>
  }

  return <article className={`kpi-card kpi-card--${accent}`}>{content}</article>
}

export default KPIStatCard
