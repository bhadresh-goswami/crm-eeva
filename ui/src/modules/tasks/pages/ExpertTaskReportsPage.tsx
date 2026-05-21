import { useEffect, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import FeedbackModal from '../components/FeedbackModal'
import ExpertReportsFilterCard from '../components/ExpertReportsFilterCard'
import ExpertReportsTable from '../components/ExpertReportsTable'
import ExpertReportsPagination from '../components/ExpertReportsPagination'
// @ts-ignore
import { loadTaskForFeedback } from '../services/expertTaskReportsService'
import { useAuth } from '../../../context/AuthContext'

const defaultFilters = {
  search: '',
  date_from: '',
  date_to: '',
  page: 1,
  limit: 10,
  sort_by: 'task_date',
  sort_order: 'DESC',
}

const ExpertTaskReportsPage = () => {
  const { user } = useAuth()
  const userId = Number(user?.id ?? 0)
  const [filters, setFilters] = useState(defaultFilters)
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, total_records: 0, per_page: 10 })
  const [loading, setLoading] = useState(false)
  const [modalMode, setModalMode] = useState<'ADD' | 'VIEW'>('ADD')
  const [taskId, setTaskId] = useState<number | null>(null)

  const fetchRows = async (payload = filters) => {
    setLoading(true)
    try {
      const scopedPayload = userId > 0 ? { ...payload, user_id: userId, expert_id: userId } : payload
      const res = await loadTaskForFeedback(scopedPayload)
      setItems(Array.isArray(res.items) ? res.items : [])
      setPagination(res.pagination ?? { current_page: 1, total_pages: 1, total_records: 0, per_page: 10 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchRows() }, [])

  const onSort = (col: string) => {
    const nextOrder = filters.sort_by === col && filters.sort_order === 'DESC' ? 'ASC' : 'DESC'
    const payload = { ...filters, sort_by: col, sort_order: nextOrder, page: 1 }
    setFilters(payload)
    void fetchRows(payload)
  }

  return (
    <PageContainer title={`Expert Task Reports${user?.name ? ` - ${user.name}` : ''}`} description="Track completed tasks and feedback activity.">
      <div style={{ backgroundColor: '#f8fafc', fontSize: '0.95rem', maxWidth: '100%', overflowX: 'hidden' }} className="px-2 px-md-2 py-2">
        <ExpertReportsFilterCard
          filters={filters}
          loading={loading}
          onChange={(key: string, value: string) => setFilters((p) => ({ ...p, [key]: value }))}
          onApply={() => { const payload = { ...filters, page: 1 }; setFilters(payload); void fetchRows(payload) }}
          onReset={() => { setFilters(defaultFilters); void fetchRows(defaultFilters) }}
        />
        <ExpertReportsTable
          items={items}
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
          onPageChange={(p: number) => { if (p < 1 || p > pagination.total_pages) return; const payload = { ...filters, page: p }; setFilters(payload); void fetchRows(payload) }}
        />
      </div>
      <FeedbackModal open={taskId !== null} mode={modalMode} taskId={taskId} onClose={() => setTaskId(null)} onSubmitted={() => void fetchRows()} />
    </PageContainer>
  )
}

export default ExpertTaskReportsPage
