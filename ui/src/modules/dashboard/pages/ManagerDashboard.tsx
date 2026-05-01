import { useEffect, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import { getManagerDashboardSummary } from '../api/dashboardApi'

type SummaryState = {
  totalRevenue: number
  revenueGrowth: string
  pendingTasks: number
  tasksGrowth: string
  pendingPayments: number
  paymentsChange: string
  successRate: string
  successGrowth: string
}

const defaultSummary: SummaryState = {
  totalRevenue: 0,
  revenueGrowth: '+0.0%',
  pendingTasks: 0,
  tasksGrowth: '+0.0%',
  pendingPayments: 0,
  paymentsChange: '+0.0%',
  successRate: '0.00%',
  successGrowth: '+0.0%',
}

const formatINR = (amount: number) => `INR ${amount.toLocaleString('en-IN')}`
const trendArrow = (value: string) => (value.trim().startsWith('-') ? '↓' : '↑')

type SummaryCardProps = {
  title: string
  value: string
  change: string
  borderClass: string
  period: string
}

const SummaryCard = ({ title, value, change, borderClass, period }: SummaryCardProps) => (
  <div className="col-xl-3 col-lg-3 col-md-6 col-sm-12">
    <div className={`card summary-card h-100 shadow-sm border-0 text-white ${borderClass}`}>
      <div className="card-body d-flex justify-content-between align-items-center">
        <div>
          <p className="summary-card__title mb-1">{title}</p>
          <h4 className="summary-card__value fw-light mb-1">{value}</h4>
          <small className="growth-text">{trendArrow(change)} {change} from {period}</small>
        </div>
        <div className="summary-card__spark" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
      </div>
    </div>
  </div>
)

export default function ManagerDashboard() {
  const [summary, setSummary] = useState<SummaryState>(defaultSummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await getManagerDashboardSummary()
        setSummary({
          totalRevenue: Number(response.totalRevenue ?? 0),
          revenueGrowth: String(response.revenueGrowth ?? '+0.0%'),
          pendingTasks: Number(response.pendingTasks ?? 0),
          tasksGrowth: String(response.tasksGrowth ?? '+0.0%'),
          pendingPayments: Number(response.pendingPayments ?? response.pendingPaymentUpdates ?? 0),
          paymentsChange: String(response.paymentsChange ?? '+0.0%'),
          successRate: String(response.successRate ?? '0.00%'),
          successGrowth: String(response.successGrowth ?? '+0.0%'),
        })
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard summary.')
      } finally {
        setLoading(false)
      }
    }

    void loadSummary()
  }, [])

  return (
    <PageContainer title="Dashboard-active" description="Home > Dashboard > Dashboard-active">
      <div className="container-fluid dashboard-summary">
        {error ? <div className="alert alert-danger mb-3">{error}</div> : null}
        <div className="row g-3">
          {loading ? (
            <div className="col-12"><div className="card shadow-sm border-0"><div className="card-body text-muted">Loading summary...</div></div></div>
          ) : (
            <>
              <SummaryCard title="Total Revenue" value={formatINR(summary.totalRevenue)} change={summary.revenueGrowth} borderClass="summary-card--revenue" period="last month" />
              <SummaryCard title="Pending Tasks" value={summary.pendingTasks.toLocaleString('en-IN')} change={summary.tasksGrowth} borderClass="summary-card--tasks" period="last week" />
              <SummaryCard title="Pending Payment Updates" value={summary.pendingPayments.toLocaleString('en-IN')} change={summary.paymentsChange} borderClass="summary-card--payments" period="yesterday" />
              <SummaryCard title="Success Rate" value={summary.successRate} change={summary.successGrowth} borderClass="summary-card--success" period="last month" />
            </>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
