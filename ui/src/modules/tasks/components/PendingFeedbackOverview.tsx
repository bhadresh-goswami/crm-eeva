import { useEffect, useMemo, useState } from 'react'
import { useAlert } from '../../../shared/alerts/useAlert'
import { getManagerReportList, type ManagerReportFilters } from '../api/tasksApi'

export type PendingFeedbackSummaryItem = { expertName: string; count: number }

export const FEEDBACK_PENDING_ENDPOINT = '/manager/reports/feedback-pending'

const normalizeReportValue = (value: unknown) => value === undefined || value === null ? '' : String(value).trim()

export const getPendingSummaryTone = (count: number) => {
  if (count > 10) return 'danger'
  if (count >= 5) return 'warning'
  return 'success'
}

export const aggregatePendingFeedbackByExpert = (rows: Record<string, unknown>[]): PendingFeedbackSummaryItem[] => {
  const counts = new Map<string, number>()
  rows.forEach((row) => {
    const expertName = normalizeReportValue(row.technical_expert) || 'N/A'
    counts.set(expertName, (counts.get(expertName) ?? 0) + 1)
  })
  return Array.from(counts, ([expertName, count]) => ({ expertName, count }))
    .sort((a, b) => b.count - a.count || a.expertName.localeCompare(b.expertName))
}

export const usePendingFeedbackSummary = (filters: ManagerReportFilters = {}) => {
  const { showToast } = useAlert()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadSummary = async () => {
      setLoading(true)
      try {
        const firstPage = await getManagerReportList(FEEDBACK_PENDING_ENDPOINT, { ...filters, page: 1, limit: 200 })
        const allRows = firstPage.items.map((row) => (row as Record<string, unknown>))
        for (let page = 2; page <= firstPage.total_pages; page += 1) {
          const result = await getManagerReportList(FEEDBACK_PENDING_ENDPOINT, { ...filters, page, limit: 200 })
          allRows.push(...result.items.map((row) => (row as Record<string, unknown>)))
        }
        if (!cancelled) setRows(allRows)
      } catch (error) {
        if (!cancelled) {
          setRows([])
          showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load pending feedback summary' })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadSummary()

    return () => {
      cancelled = true
    }
  }, [filters.candidate_id, filters.client_id, filters.expert_id, filters.from_date, filters.task_type_id, filters.to_date, showToast])

  const summary = useMemo(() => aggregatePendingFeedbackByExpert(rows), [rows])
  const totalPending = rows.length

  return { loading, summary, totalPending }
}

type PendingFeedbackOverviewProps = {
  filters?: ManagerReportFilters
  title?: string
  subtitle?: string
  emptyTitle?: string
  emptyMessage?: string
  dashboardVariant?: boolean
  onExpertClick?: (expertName: string) => void
}

const PendingFeedbackOverview = ({
  filters = {},
  title = 'Expert-wise Pending Feedback Summary',
  subtitle = 'Counts are grouped from the same filtered pending feedback report records.',
  emptyTitle,
  emptyMessage = 'No pending feedback found.',
  dashboardVariant = false,
  onExpertClick,
}: PendingFeedbackOverviewProps) => {
  const { loading, summary, totalPending } = usePendingFeedbackSummary(filters)
  const handleExpertClick = (expertName: string) => {
    if (onExpertClick) {
      onExpertClick(expertName)
      return
    }
  }

  return (
    <div className={`pending-feedback-summary card${dashboardVariant ? ' pending-feedback-summary--dashboard' : ''}`}>
      <div className="d-flex flex-column flex-md-row justify-content-between gap-2 mb-3">
        <div>
          <h3 className="card-title mb-1">{title}</h3>
          <p className="text-muted mb-0">{subtitle}</p>
        </div>
        <span className="badge bg-primary-subtle text-primary align-self-start">{totalPending} Total Pending</span>
      </div>
      {loading ? <div className="dashboard-cards pending-feedback-summary__grid">{[0, 1, 2, 3].map((item) => <div key={item} className="metric-card skeleton-card" />)}</div> : summary.length === 0 ? <div className="text-center text-muted py-3">{emptyTitle ? <div className="pending-feedback-summary__empty-title">{emptyTitle}</div> : null}<div>{emptyMessage}</div></div> : <div className="dashboard-cards pending-feedback-summary__grid">
        {summary.map((item, index) => {
          const tone = getPendingSummaryTone(item.count)
          const cardContent = (
            <>
              {dashboardVariant ? <span className="pending-feedback-summary__rank">#{index + 1}</span> : null}
              <div className="dashboard-card__label">Technical Expert</div>
              <div className="pending-feedback-summary__expert" title={item.expertName}>{item.expertName}</div>
              <div className="d-flex align-items-end justify-content-between gap-2 mt-3">
                <div className="dashboard-card__value mb-0">{item.count}</div>
                <span className={`badge bg-${tone}-subtle text-${tone}${tone === 'warning' ? '-emphasis' : ''}`}>Pending Feedbacks</span>
              </div>
            </>
          )

          return onExpertClick || dashboardVariant ? (
            <button key={item.expertName} type="button" className={`metric-card pending-feedback-summary__card pending-feedback-summary__card--${tone} pending-feedback-summary__card--clickable`} onClick={() => handleExpertClick(item.expertName)}>
              {cardContent}
            </button>
          ) : (
            <div key={item.expertName} className={`metric-card pending-feedback-summary__card pending-feedback-summary__card--${tone}`}>
              {cardContent}
            </div>
          )
        })}
      </div>}
    </div>
  )
}

export default PendingFeedbackOverview
