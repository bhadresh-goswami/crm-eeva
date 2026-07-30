import { type ReactNode } from 'react'

type ChartCardProps = {
  title: string
  children: ReactNode
}

const ChartCard = ({ title, children }: ChartCardProps) => {
  return (
    <article className="card chart-card">
      <h3 className="chart-card__title">{title}</h3>
      {children}
    </article>
  )
}

export default ChartCard
