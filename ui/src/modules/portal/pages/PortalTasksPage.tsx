import { useCallback, useEffect, useMemo, useState } from 'react'
import StatusBadge from '../../../components/dashboard/StatusBadge'
import ExpertReportsPagination from '../../tasks/components/ExpertReportsPagination'
import AnimatedModal from '../../../shared/components/AnimatedModal'
import PageContainer from '../../../shared/components/PageContainer'
import { useAlert } from '../../../shared/alerts/useAlert'
import {
  addPortalTaskComment,
  getPortalFilters,
  getPortalTaskDetail,
  getPortalTasks,
  type PortalComment,
  type PortalFile,
  type PortalTask,
} from '../api/portalApi'

type Filters = {
  search: string
  status: string
  task_type: string
  date_from: string
  date_to: string
}

const defaultFilters: Filters = {
  search: '',
  status: '',
  task_type: '',
  date_from: '',
  date_to: '',
}

const formatDate = (value: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

const PortalTasksPage = () => {
  const { showToast } = useAlert()
  const [tasks, setTasks] = useState<PortalTask[]>([])
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [draftFilters, setDraftFilters] = useState<Filters>(defaultFilters)
  const [statuses, setStatuses] = useState<string[]>([])
  const [taskTypes, setTaskTypes] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<PortalTask | null>(null)
  const [comments, setComments] = useState<PortalComment[]>([])
  const [files, setFiles] = useState<PortalFile[]>([])
  const [comment, setComment] = useState('')
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isCommentSaving, setIsCommentSaving] = useState(false)

  useEffect(() => {
    getPortalFilters()
      .then((data) => {
        setStatuses(data.statuses)
        setTaskTypes(data.task_types)
      })
      .catch((error) => setPageError(error instanceof Error ? error.message : 'Failed to load filters.'))
  }, [])

  const loadTasks = useCallback(async () => {
    setIsLoading(true)
    setPageError(null)
    try {
      const response = await getPortalTasks({ page, per_page: perPage, ...filters })
      setTasks(response.data)
      setTotal(response.meta.total)
      setTotalPages(Math.max(1, response.meta.total_pages))
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load portal tasks.')
    } finally {
      setIsLoading(false)
    }
  }, [filters, page, perPage])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setDraftFilters((current) => ({ ...current, [key]: value }))
  }

  const applyFilters = () => {
    setPage(1)
    setFilters(draftFilters)
  }

  const resetFilters = () => {
    setDraftFilters(defaultFilters)
    setFilters(defaultFilters)
    setPage(1)
  }

  const openTask = async (taskId: number) => {
    setIsDetailLoading(true)
    setComment('')
    try {
      const detail = await getPortalTaskDetail(taskId)
      setSelectedTask(detail.task)
      setComments(detail.comments)
      setFiles(detail.files)
    } catch (error) {
      showToast({ type: 'error', title: 'Task details failed', message: error instanceof Error ? error.message : 'Failed to load task details.' })
    } finally {
      setIsDetailLoading(false)
    }
  }

  const saveComment = async () => {
    if (!selectedTask || !comment.trim()) return
    setIsCommentSaving(true)
    try {
      await addPortalTaskComment(selectedTask.id, comment.trim())
      const detail = await getPortalTaskDetail(selectedTask.id)
      setComments(detail.comments)
      setComment('')
      showToast({ type: 'success', message: 'Comment added successfully.' })
    } catch (error) {
      showToast({ type: 'error', title: 'Comment failed', message: error instanceof Error ? error.message : 'Failed to add comment.' })
    } finally {
      setIsCommentSaving(false)
    }
  }

  const tableRows = useMemo(() => tasks, [tasks])

  return (
    <PageContainer title="Portal Tasks" description="View your client/vendor tasks, statuses, attachments and communication.">
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-center mb-2 gap-2 flex-wrap">
            <h6 className="mb-0 fw-semibold text-dark">Filter Tasks</h6>
            <div className="d-flex align-items-center gap-2">
              <label className="form-label mb-0 text-muted fw-semibold">Entries</label>
              <select className="form-select form-select-sm" value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1) }}>
                {[20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
          </div>
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-3"><label className="form-label fw-semibold text-muted mb-1">Search</label><input className="form-control" value={draftFilters.search} onChange={(event) => handleFilterChange('search', event.target.value)} placeholder="Task, candidate, client..." /></div>
            <div className="col-12 col-md-2"><label className="form-label fw-semibold text-muted mb-1">Status</label><select className="form-select" value={draftFilters.status} onChange={(event) => handleFilterChange('status', event.target.value)}><option value="">All</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
            <div className="col-12 col-md-2"><label className="form-label fw-semibold text-muted mb-1">Task Type</label><select className="form-select" value={draftFilters.task_type} onChange={(event) => handleFilterChange('task_type', event.target.value)}><option value="">All</option>{taskTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
            <div className="col-12 col-md-2"><label className="form-label fw-semibold text-muted mb-1">Date From</label><input type="date" className="form-control" value={draftFilters.date_from} onChange={(event) => handleFilterChange('date_from', event.target.value)} /></div>
            <div className="col-12 col-md-2"><label className="form-label fw-semibold text-muted mb-1">Date To</label><input type="date" className="form-control" value={draftFilters.date_to} onChange={(event) => handleFilterChange('date_to', event.target.value)} /></div>
            <div className="col-12 col-md-1 d-flex gap-2"><button className="btn btn-primary fw-semibold" type="button" onClick={applyFilters} disabled={isLoading}>Apply</button><button className="btn btn-link text-secondary text-decoration-none" type="button" onClick={resetFilters} disabled={isLoading}>Reset</button></div>
          </div>
        </div>
      </div>

      {pageError ? <div className="alert alert-danger">{pageError}</div> : null}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light"><tr><th>Task</th><th>Candidate</th><th>Type</th><th>Status</th><th>Due Date</th><th>Time</th><th>Amount</th><th>Action</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={8} className="text-center py-4 text-muted">Loading tasks...</td></tr> : null}
              {!isLoading && tableRows.length === 0 ? <tr><td colSpan={8} className="text-center py-4 text-muted">No tasks found.</td></tr> : null}
              {!isLoading && tableRows.map((task) => (
                <tr key={task.id}>
                  <td><div className="fw-semibold">{task.title || `Task #${task.id}`}</div><div className="text-muted small">{task.company_name || task.client_name || '-'}</div></td>
                  <td>{task.candidate_name || '-'}</td>
                  <td>{task.task_type || '-'}</td>
                  <td>{task.status_name ? <StatusBadge status={task.status_name} /> : '-'}</td>
                  <td>{formatDate(task.due_date || task.created_at)}</td>
                  <td>{task.start_time || '-'}{task.end_time ? ` - ${task.end_time}` : ''}</td>
                  <td>{task.total_amount ? `$${task.total_amount.toFixed(2)}` : '-'}</td>
                  <td><button type="button" className="btn btn-sm btn-outline-primary" disabled={isDetailLoading} onClick={() => void openTask(task.id)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ExpertReportsPagination page={page} totalPages={totalPages} totalRecords={total} perPage={perPage} onPageChange={(nextPage) => setPage(Math.min(Math.max(1, nextPage), totalPages))} />

      <AnimatedModal isOpen={Boolean(selectedTask)} title="Task Details" onClose={() => setSelectedTask(null)} size="xl">
        {selectedTask ? (
          <div className="p-4">
            <div className="d-flex justify-content-between gap-3 align-items-start mb-3">
              <div><h4 className="mb-1">{selectedTask.title || `Task #${selectedTask.id}`}</h4><p className="text-muted mb-0">{selectedTask.company_name || selectedTask.client_name || '-'} • {selectedTask.candidate_name || '-'}</p></div>
              <button type="button" className="btn-close" aria-label="Close" onClick={() => setSelectedTask(null)} />
            </div>
            <div className="row g-3 mb-3">
              <div className="col-md-3"><div className="text-muted small">Status</div>{selectedTask.status_name ? <StatusBadge status={selectedTask.status_name} /> : '-'}</div>
              <div className="col-md-3"><div className="text-muted small">Task Type</div><div className="fw-semibold">{selectedTask.task_type || '-'}</div></div>
              <div className="col-md-3"><div className="text-muted small">Due Date</div><div className="fw-semibold">{formatDate(selectedTask.due_date || selectedTask.created_at)}</div></div>
              <div className="col-md-3"><div className="text-muted small">POC</div><div className="fw-semibold">{selectedTask.poc_name || '-'}</div></div>
            </div>
            <div className="mb-3"><div className="text-muted small">Description</div><div className="border rounded p-3 bg-light">{selectedTask.description || 'No description available.'}</div></div>
            <div className="mb-3"><h6>Attachments</h6>{files.length === 0 ? <p className="text-muted">No attachments available.</p> : files.map((file) => <a key={file.id} className="d-block" href={file.file_url} target="_blank" rel="noreferrer">{file.file_url}</a>)}</div>
            <div className="mb-3"><h6>Comments</h6>{comments.length === 0 ? <p className="text-muted">No comments yet.</p> : comments.map((item) => <div key={item.id} className="border rounded p-2 mb-2"><div className="fw-semibold small">{item.user_name || 'User'} <span className="text-muted fw-normal">{formatDate(item.created_at)}</span></div><div>{item.comment}</div></div>)}</div>
            <div className="d-flex gap-2"><input className="form-control" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment..." /><button className="btn btn-primary" type="button" onClick={() => void saveComment()} disabled={isCommentSaving || !comment.trim()}>Send</button></div>
          </div>
        ) : null}
      </AnimatedModal>
    </PageContainer>
  )
}

export default PortalTasksPage
