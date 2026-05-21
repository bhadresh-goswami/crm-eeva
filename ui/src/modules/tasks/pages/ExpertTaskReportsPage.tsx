import { useEffect, useMemo, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import FeedbackModal from '../components/FeedbackModal'
import ExpertReportsFilterCard from '../components/ExpertReportsFilterCard'
import ExpertReportsTable from '../components/ExpertReportsTable'
import ExpertReportsPagination from '../components/ExpertReportsPagination'
// @ts-ignore
import { loadTaskForFeedback } from '../services/expertTaskReportsService'
import { useAuth } from '../../../context/AuthContext'

const defaultFilters = {
  candidate_name: '',
  task_type: '',
  status_name: '',
  date_from: '',
  date_to: '',
  page: 1,
  limit: 20,
  sort_by: 'task_date',
  sort_order: 'DESC',
}

const ExpertTaskReportsPage = () => {
  const { user } = useAuth()
  const sessionExpertId = Number(user?.expert_id ?? user?.user_id ?? user?.id ?? 0)
  const [filters, setFilters] = useState(defaultFilters)
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, total_records: 0, per_page: 10 })
  const [loading, setLoading] = useState(false)
  const [taskTypeCounts, setTaskTypeCounts] = useState<Record<string, number>>({})
  const [modalMode, setModalMode] = useState<'ADD' | 'VIEW'>('ADD')
  const [taskId, setTaskId] = useState<number | null>(null)

  const filteredItems = useMemo(() => items, [items])

  const summaryBadges = useMemo(() => taskTypeCounts, [taskTypeCounts])

  const candidateOptions = useMemo(() => Array.from(new Set(items.map((r: any) => String(r.candidate_name || '').trim()).filter(Boolean))).sort(), [items])
  const taskTypeOptions = useMemo(() => Array.from(new Set(items.map((r: any) => String(r.task_type || '').trim()).filter(Boolean))).sort(), [items])
  const statusOptions = useMemo(() => Array.from(new Set(items.map((r: any) => String(r.status_name || '').trim()).filter(Boolean))).sort(), [items])

  const fetchRows = async (payload = filters) => {
    setLoading(true)
    try {
      const scopedPayload = sessionExpertId > 0 ? { ...payload, user_id: sessionExpertId, expert_id: sessionExpertId } : payload
      const res = await loadTaskForFeedback(scopedPayload)
      setItems(Array.isArray(res.items) ? res.items.map((row: any) => ({ ...row, id: Number(row.task_id ?? row.id), start_time: row.ist_start_time ?? row.start_time, end_time: row.ist_end_time ?? row.end_time, has_feedback: String(row.feedback_status || '').toLowerCase() === 'submitted', feedback_id: row.feedback_id ?? null })) : [])
      const mappedCounts = Array.isArray(res.task_type_counts)
        ? res.task_type_counts.reduce((acc: Record<string, number>, item: any) => {
            const key = String(item.task_type || 'Unknown')
            acc[key] = Number(item.total ?? 0)
            return acc
          }, {})
        : {}
      setTaskTypeCounts(mappedCounts)
      setPagination(res.pagination ?? { current_page: 1, total_pages: 1, total_records: 0, per_page: 10 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (sessionExpertId > 0) void fetchRows() }, [sessionExpertId])

  const onSort = (col: string) => {
    const nextOrder = filters.sort_by === col && filters.sort_order === 'DESC' ? 'ASC' : 'DESC'
    const payload = { ...filters, sort_by: col, sort_order: nextOrder, page: 1 }
    setFilters(payload)
    void fetchRows(payload)
  }

  return (
    <PageContainer title={`Expert Task Reports${user?.name ? ` - ${user.name}` : ''}`} description="Professional expert personal activity report.">
      <div style={{ backgroundColor: '#f8fafc', fontSize: '0.95rem', maxWidth: '100%', overflowX: 'hidden' }} className="px-2 px-md-2 py-2">
        <ExpertReportsFilterCard
          filters={filters}
          loading={loading}
          onChange={(key: string, value: string) => setFilters((p) => ({ ...p, [key]: value }))}
          onApply={() => { const payload = { ...filters, page: 1 }; setFilters(payload); void fetchRows(payload) }}
          onReset={() => { setFilters(defaultFilters); void fetchRows(defaultFilters) }}
          candidateOptions={candidateOptions}
          taskTypeOptions={taskTypeOptions}
          statusOptions={statusOptions}
          pageSize={filters.limit}
          onPageSizeChange={(size: number) => { const payload = { ...filters, page: 1, limit: size }; setFilters(payload); void fetchRows(payload) }}
        />
        <div className="d-flex flex-wrap gap-2 mb-2">
          {Object.entries(summaryBadges).map(([taskType, count]) => (
            <span key={taskType} className="badge rounded-pill text-primary-emphasis" style={{ backgroundColor: '#dbeafe', fontSize: '0.82rem', padding: '0.5rem 0.7rem' }}>
              {taskType} <span className="badge rounded-pill text-bg-primary ms-1">{String(count).padStart(2, '0')}</span>
            </span>
          ))}
        </div>
        <ExpertReportsTable
          items={filteredItems}
          loading={loading}
          sortBy={filters.sort_by}
          sortOrder={filters.sort_order}
          onSort={onSort}
          onAddFeedback={(id: number) => { setModalMode('ADD'); setTaskId(id) }}
          onViewFeedback={(id: number) => { setModalMode('VIEW'); setTaskId(id) }}
        />
        <ExpertReportsPagination
          page={pagination.current_page}
          totalPages={pagination.total_pages}
          totalRecords={pagination.total_records}
          perPage={filters.limit}
          onPageChange={(p: number) => { if (p < 1 || p > pagination.total_pages) return; const payload = { ...filters, page: p }; setFilters(payload); void fetchRows(payload) }}
        />
      </div>
      <FeedbackModal open={taskId !== null} mode={modalMode} taskId={taskId} onClose={() => setTaskId(null)} onSubmitted={() => void fetchRows()} />
    </PageContainer>
  )
}

export default ExpertTaskReportsPage
