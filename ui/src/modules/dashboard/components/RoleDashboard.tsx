import DashboardSection from './DashboardSection'

type RoleDashboardProps = {
  roleLabel: string
}

const RoleDashboard = ({ roleLabel }: RoleDashboardProps) => {
  return (
    <section>
      <h2 className="page-title">{roleLabel} Dashboard</h2>
      <p className="page-description">Overview tailored for the {roleLabel.toLowerCase()} role.</p>
      <div className="cards-grid">
        <DashboardSection title="Summary" />
        <DashboardSection title="Tasks" />
        <DashboardSection title="Activity" />
      </div>
    </section>
  )
}

export default RoleDashboard
