const DashboardPage = () => {
  return (
    <section>
      <h2 className="page-title">Dashboard</h2>
      <p className="page-description">Welcome to your CRM dashboard. Track your team activity and customer pipeline here.</p>
      <div className="cards-grid">
        <article className="card">
          <h3>Open Opportunities</h3>
          <p className="card-value">24</p>
        </article>
        <article className="card">
          <h3>Deals Closing This Week</h3>
          <p className="card-value">7</p>
        </article>
        <article className="card">
          <h3>New Leads</h3>
          <p className="card-value">13</p>
        </article>
      </div>
    </section>
  )
}

export default DashboardPage
