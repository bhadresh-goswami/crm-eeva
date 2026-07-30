type DashboardSectionProps = {
  title: string
}

const DashboardSection = ({ title }: DashboardSectionProps) => {
  return (
    <article className="card">
      <h3>{title}</h3>
      <p className="card-text">{title} information goes here.</p>
    </article>
  )
}

export default DashboardSection
