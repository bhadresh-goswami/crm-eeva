import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getClients, type ClientItem } from '../../clients/api/clientsApi'
import { useAuth } from '../../../context/AuthContext'
import {
  assignTask,
  bulkAssignTasks,
  bulkCancelTasks,
  cancelTask,
  createTask,
  getCandidatesByClient,
  getExperts,
  getPocsByClient,
  getTaskTypes,
  getTasks,
  updateTask,
  type CandidateOption,
  type ExpertRecord,
  type PocOption,
  type TaskPayload,
  type TaskRecord,
  type TaskTypeOption,
} from '../api/tasksApi'

type Option = { id: number; label: string }

type SearchableSelectProps = {
  label: string
  required?: boolean
  disabled?: boolean
  loading?: boolean
  value: number | null
  placeholder: string
  options: Option[]
  emptyText?: string
  error?: string
  onChange: (value: number | null) => void
}

const SearchableSelect = ({
  label,
  required,
  disabled,
  loading,
  value,
  placeholder,
  options,
  emptyText = 'No data found',
  error,
  onChange,
}: SearchableSelectProps) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const selectedOption = options.find((option) => option.id === value)

  useEffect(() => {
    setQuery(selectedOption?.label ?? '')
  }, [selectedOption?.label])

  const filtered = options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <label className="auth-card__field" style={{ position: 'relative' }}>
      {label} {required ? <span className="auth-card__error">*</span> : null}
      <input
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        className={error ? 'field-error' : ''}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
          if (!event.target.value.trim()) onChange(null)
        }}
        onBlur={() => {
          setTimeout(() => {
            setIsOpen(false)
            if (!options.some((option) => option.id === value)) {
              setQuery('')
            }
          }, 120)
        }}
      />
      {isOpen ? (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: 180,
            overflowY: 'auto',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            background: '#fff',
            zIndex: 30,
            marginTop: 4,
          }}
        >
          {loading ? <div style={{ padding: 10 }}>Loading...</div> : null}
          {!loading && filtered.length === 0 ? <div style={{ padding: 10 }}>{emptyText}</div> : null}
          {!loading
            ? filtered.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="button"
                  style={{ width: '100%', textAlign: 'left', border: 0, borderRadius: 0 }}
                  onMouseDown={() => {
                    onChange(option.id)
                    setQuery(option.label)
                    setIsOpen(false)
                  }}
                >
                  {option.label}
                </button>
              ))
            : null}
        </div>
      ) : null}
      {error ? <small className="auth-card__error">{error}</small> : null}
    </label>
  )
}

type TaskFormState = {
  client_id: number | null
  poc_id: number | null
  candidate_id: number | null
  due_date: string
  start_time: string
  end_time: string
  task_type_id: number | null
  title: string
  duration: number
  description: string
  total_amount: string
  payment_mode: string
  attachment: File | null
}

const defaultForm: TaskFormState = {
  client_id: null,
  poc_id: null,
  candidate_id: null,
  due_date: '',
  start_time: '',
  end_time: '',
  task_type_id: null,
  title: '',
  duration: 30,
  description: '',
  total_amount: '',
  payment_mode: 'UPI',
  attachment: null,
}

const formatDisplayDate = (value: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

const todayString = () => new Date().toISOString().slice(0, 10)
const formatTime = (value: string) => (value ? value.slice(0, 5) : '—')

const normalizeError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message.trim() : fallback
  if (!message || message.startsWith('<') || message.toLowerCase().includes('unexpected token')) {
    return fallback
  }
  return message
}

const calcEndTime = (start: string, duration: number) => {
  if (!start || duration <= 0) return ''
  const [hour, minute] = start.split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return ''
  const startMinutes = hour * 60 + minute
  const total = startMinutes + duration
  const nextHour = Math.floor((total % (24 * 60)) / 60)
  const nextMinute = total % 60
  return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`
}

const toApiPayload = (state: TaskFormState): TaskPayload => ({
  client_id: state.client_id ?? 0,
  poc_id: state.poc_id ?? 0,
  candidate_id: state.candidate_id ?? 0,
  task_type_id: state.task_type_id ?? 0,
  title: state.title.trim(),
  description: state.description,
  due_date: state.due_date,
  start_time: state.start_time,
  end_time: state.end_time,
  duration: state.duration,
  total_amount: Number(state.total_amount),
  payment_mode: state.payment_mode.trim() || 'UPI',
  attachment: state.attachment,
})

const TasksPage = () => {
  const { user } = useAuth()
  const editorRef = useRef<HTMLDivElement | null>(null)
  const canManage = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'coordinator'

  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [clients, setClients] = useState<ClientItem[]>([])
  const [taskTypes, setTaskTypes] = useState<TaskTypeOption[]>([])
  const [pocs, setPocs] = useState<PocOption[]>([])
  const [candidates, setCandidates] = useState<CandidateOption[]>([])
  const [loadingPocs, setLoadingPocs] = useState(false)
  const [loadingCandidates, setLoadingCandidates] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [candidateFilter, setCandidateFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [formState, setFormState] = useState<TaskFormState>(defaultForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [activeTask, setActiveTask] = useState<TaskRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [descriptionPreview, setDescriptionPreview] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<TaskRecord | null>(null)
  const [actionTaskId, setActionTaskId] = useState<number | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  const [assignTarget, setAssignTarget] = useState<TaskRecord | null>(null)
  const [experts, setExperts] = useState<ExpertRecord[]>([])
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignLoading, setAssignLoading] = useState(false)
  const [selectedExpertId, setSelectedExpertId] = useState<number | null>(null)
  const [reassignReason, setReassignReason] = useState('')
  const [isBulkAssign, setIsBulkAssign] = useState(false)

  const showSuccess = useCallback((message: string) => {
    setSuccess(message)
    setTimeout(() => setSuccess(null), 2500)
  }, [])

  const loadPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tasksData, clientsData, taskTypeData] = await Promise.all([getTasks(), getClients(), getTaskTypes()])
      setTasks(tasksData)
      setClients(clientsData)
      setTaskTypes(taskTypeData)
    } catch (err) {
      setError(normalizeError(err, 'Failed to load tasks.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  useEffect(() => {
    const nextEnd = calcEndTime(formState.start_time, formState.duration)
    setFormState((prev) => ({ ...prev, end_time: nextEnd }))
  }, [formState.start_time, formState.duration])

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (candidateFilter && !task.candidate.toLowerCase().includes(candidateFilter.toLowerCase())) return false
        if (companyFilter && task.client !== companyFilter) return false
        if (statusFilter && task.status !== statusFilter) return false
        if (assigneeFilter && (task.assigned_to_name || '') !== assigneeFilter) return false
        return true
      }),
    [assigneeFilter, candidateFilter, companyFilter, statusFilter, tasks],
  )
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / rowsPerPage))
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredTasks.slice(start, start + rowsPerPage)
  }, [currentPage, filteredTasks])
  const pageTaskIds = paginatedTasks.map((task) => task.id)
  const isAllPageSelected = pageTaskIds.length > 0 && pageTaskIds.every((id) => selectedTaskIds.includes(id))

  useEffect(() => {
    setCurrentPage(1)
  }, [candidateFilter, companyFilter, statusFilter, assigneeFilter])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    setSelectedTaskIds((prev) => prev.filter((id) => tasks.some((task) => task.id === id)))
  }, [tasks])

  const clientOptions = useMemo(
    () => clients.map((client) => ({ id: client.id, label: client.company_name || client.name })).sort((a, b) => a.label.localeCompare(b.label)),
    [clients],
  )

  const pocOptions = useMemo(() => pocs.map((poc) => ({ id: poc.id, label: poc.name })), [pocs])
  const candidateOptions = useMemo(() => candidates.map((item) => ({ id: item.id, label: item.name })), [candidates])
  const taskTypeOptions = useMemo(() => taskTypes.map((item) => ({ id: item.id, label: item.name })), [taskTypes])

  const assigneeOptions = useMemo(
    () => [...new Set(tasks.map((task) => task.assigned_to_name).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [tasks],
  )

  const loadClientDependentOptions = useCallback(async (clientId: number) => {
    setLoadingPocs(true)
    setLoadingCandidates(true)
    try {
      const [pocData, candidateData] = await Promise.all([getPocsByClient(clientId), getCandidatesByClient(clientId)])
      setPocs(pocData)
      setCandidates(candidateData)
    } catch (err) {
      setFormError(normalizeError(err, 'Failed to load POC/Candidate for selected client.'))
    } finally {
      setLoadingPocs(false)
      setLoadingCandidates(false)
    }
  }, [])

  const openCreate = () => {
    setFormMode('create')
    setActiveTask(null)
    setFormState(defaultForm)
    setFormError(null)
    setFormErrors({})
    setPocs([])
    setCandidates([])
    setIsFormOpen(true)
    if (editorRef.current) editorRef.current.innerHTML = ''
  }

  const openEdit = async (task: TaskRecord) => {
    setFormMode('edit')
    setActiveTask(task)
    setFormError(null)
    setFormErrors({})

    const state: TaskFormState = {
      client_id: task.client_id,
      poc_id: task.poc_id,
      candidate_id: task.candidate_id,
      due_date: task.due_date.slice(0, 10),
      start_time: task.time_start,
      end_time: task.time_end,
      task_type_id: task.task_type_id,
      title: task.title,
      duration: task.duration || 30,
      description: task.description,
      total_amount: String(task.total_amount || ''),
      payment_mode: task.payment_mode || 'UPI',
      attachment: null,
    }

    setFormState(state)
    setIsFormOpen(true)
    if (editorRef.current) editorRef.current.innerHTML = state.description

    if (state.client_id) {
      await loadClientDependentOptions(state.client_id)
    }
  }

  const validateForm = (state: TaskFormState) => {
    const nextErrors: Record<string, string> = {}
    if (!state.client_id) nextErrors.client_id = 'Client is required.'
    if (!state.poc_id) nextErrors.poc_id = 'POC is required.'
    if (!state.candidate_id) nextErrors.candidate_id = 'Candidate is required.'
    if (!state.task_type_id) nextErrors.task_type_id = 'Task type is required.'
    if (!state.title.trim()) nextErrors.title = 'Subject line is required.'
    if (state.title.trim().length > 255) nextErrors.title = 'Max 255 characters allowed.'
    if (!state.due_date) nextErrors.due_date = 'Due date is required.'
    if (state.due_date && state.due_date < todayString()) nextErrors.due_date = 'Due date must be today or future.'
    if (!state.start_time) nextErrors.start_time = 'Start time is required.'
    if (state.duration < 1 || state.duration > 500) nextErrors.duration = 'Duration must be between 1 and 500.'

    const amount = Number(state.total_amount)
    if (!state.total_amount.trim()) nextErrors.total_amount = 'Amount is required.'
    if (Number.isNaN(amount) || amount < 0) nextErrors.total_amount = 'Amount must be positive.'

    if (!state.description.trim()) nextErrors.description = 'Description is required.'

    return nextErrors
  }

  const handleSave = async () => {
    const description = editorRef.current?.innerHTML?.trim() ?? formState.description
    const nextState = { ...formState, description }
    const errorsFound = validateForm(nextState)
    setFormErrors(errorsFound)
    if (Object.keys(errorsFound).length > 0) return

    setIsSubmitting(true)
    setFormError(null)

    try {
      const payload = toApiPayload(nextState)
      if (formMode === 'create') {
        await createTask(payload)
        showSuccess('Task created successfully.')
      } else if (activeTask) {
        await updateTask({ ...payload, id: activeTask.id })
        showSuccess('Task updated successfully.')
      }
      setIsFormOpen(false)
      await loadPage()
    } catch (err) {
      setFormError(normalizeError(err, 'Failed to save task.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionTaskId(deleteTarget.id)
    setError(null)
    try {
      await cancelTask(deleteTarget.id)
      setDeleteTarget(null)
      showSuccess('Task cancelled successfully.')
      await loadPage()
    } catch (err) {
      setError(normalizeError(err, 'Failed to delete task.'))
    } finally {
      setActionTaskId(null)
    }
  }

  const checkAvailability = useCallback(
    (expertId: number) => {
      if (!assignTarget) return 'available'
      const blockingTask = tasks.find(
        (task) =>
          task.id !== assignTarget.id &&
          task.assigned_to_id === expertId &&
          task.due_date.slice(0, 10) === assignTarget.due_date.slice(0, 10) &&
          task.time_start === assignTarget.time_start &&
          task.time_end === assignTarget.time_end,
      )
      return blockingTask ? 'busy' : 'available'
    },
    [assignTarget, tasks],
  )

  const openAssign = async (task?: TaskRecord) => {
    setAssignTarget(task ?? null)
    setIsBulkAssign(!task)
    setSelectedExpertId(null)
    setReassignReason('')
    setAssignError(null)
    setAssignLoading(true)
    try {
      setExperts(await getExperts())
    } catch (err) {
      setAssignError(normalizeError(err, 'Failed to load experts.'))
    } finally {
      setAssignLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedExpertId) {
      setAssignError('Please select an available expert.')
      return
    }
    if (assignTarget?.assigned_to_id && !reassignReason.trim()) {
      setAssignError('Reassign reason is required.')
      return
    }

    setAssignError(null)
    if (assignTarget) {
      setActionTaskId(assignTarget.id)
    }
    try {
      if (isBulkAssign) {
        await bulkAssignTasks({ task_ids: selectedTaskIds, user_id: selectedExpertId })
      } else if (assignTarget) {
        await assignTask({
          task_id: assignTarget.id,
          user_id: selectedExpertId,
          reason: assignTarget.assigned_to_id ? reassignReason.trim() : undefined,
        })
      }
      setAssignTarget(null)
      setSelectedTaskIds([])
      showSuccess(isBulkAssign ? 'Tasks assigned successfully.' : assignTarget?.assigned_to_id ? 'Task reassigned successfully.' : 'Task assigned successfully.')
      await loadPage()
    } catch (err) {
      setAssignError(normalizeError(err, 'Failed to assign task.'))
    } finally {
      setActionTaskId(null)
    }
  }

  const handleBulkCancel = async () => {
    if (!selectedTaskIds.length) return
    try {
      await bulkCancelTasks(selectedTaskIds)
      setSelectedTaskIds([])
      showSuccess('Selected tasks cancelled.')
      await loadPage()
    } catch (err) {
      setError(normalizeError(err, 'Failed to cancel selected tasks.'))
    }
  }

  const handleDownloadFile = async (fileUrl: string) => {
    const filename = fileUrl.split('/').pop()
    if (!filename) return
    const raw = localStorage.getItem('crm_auth')
    const token = raw ? (JSON.parse(raw) as { token?: string }).token : null
    const response = await fetch(`https://support.bsquareg-developers.com/api/tasks/file?file=${encodeURIComponent(filename)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) throw new Error('Failed to download file')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const execEditorCommand = (command: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    setFormState((prev) => ({ ...prev, description: editorRef.current?.innerHTML ?? '' }))
  }

  return (
    <section>
      <div className="users-page__header">
        <h2 className="page-title">Task Management</h2>
        {canManage ? (
          <button className="button button--primary" onClick={openCreate}>
            + Add Task
          </button>
        ) : null}
      </div>

      {error ? <p className="auth-card__error roles-feedback">{error}</p> : null}
      {success ? <p className="roles-success roles-feedback">{success}</p> : null}

      <div className="card clients-controls">
        <label className="auth-card__field">
          Candidate
          <input value={candidateFilter} onChange={(event) => setCandidateFilter(event.target.value)} placeholder="Search" />
        </label>
        <label className="auth-card__field">
          Company
          <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
            <option value="">All</option>
            {[...new Set(tasks.map((task) => task.client).filter(Boolean))].map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="auth-card__field">
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All</option>
            {['pending', 'assigned', 'in_progress', 'completed', 'cancelled'].map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="auth-card__field">
          Assign To
          <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
            <option value="">All</option>
            {assigneeOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={isAllPageSelected}
            onChange={(event) => {
              if (event.target.checked) {
                setSelectedTaskIds((prev) => [...new Set([...prev, ...pageTaskIds])])
              } else {
                setSelectedTaskIds((prev) => prev.filter((id) => !pageTaskIds.includes(id)))
              }
            }}
          />
          Select All
        </label>
        <button className="button" disabled={!selectedTaskIds.length || !canManage} onClick={() => void openAssign()}>
          👤 Bulk Assign
        </button>
        <button className="button button--danger" disabled={!selectedTaskIds.length || !canManage} onClick={() => void handleBulkCancel()}>
          🗑 Cancel Selected
        </button>
      </div>

      <div className="card clients-table__wrapper" style={{ height: 500, overflow: 'auto' }}>
        {loading ? <p className="users-loader">Loading tasks...</p> : null}
        {!loading && filteredTasks.length === 0 ? <p className="users-empty">No tasks found.</p> : null}
        {!loading && filteredTasks.length > 0 ? (
          <table className="roles-table users-table" style={{ minWidth: 1650, whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', top: 0, background: '#fff' }}>✓</th>
                <th style={{ position: 'sticky', top: 0, background: '#fff' }}>SR No</th>
                <th style={{ position: 'sticky', top: 0, background: '#fff' }}>Date</th>
                <th style={{ position: 'sticky', top: 0, background: '#fff' }}>Candidate</th>
                <th style={{ position: 'sticky', top: 0, background: '#fff' }}>Company</th>
                <th style={{ position: 'sticky', top: 0, background: '#fff' }}>Status</th>
                <th style={{ position: 'sticky', top: 0, background: '#fff' }}>Assign To</th>
                <th style={{ position: 'sticky', top: 0, background: '#fff' }}>Time Start</th>
                <th style={{ position: 'sticky', top: 0, background: '#fff' }}>Time End</th>
                <th style={{ position: 'sticky', top: 0, background: '#fff' }}>File</th>
                <th style={{ position: 'sticky', top: 0, background: '#fff' }}>Description</th>
                <th style={{ position: 'sticky', top: 0, background: '#fff' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.map((task, index) => (
                <tr key={task.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.includes(task.id)}
                      onChange={(event) =>
                        setSelectedTaskIds((prev) =>
                          event.target.checked ? [...new Set([...prev, task.id])] : prev.filter((id) => id !== task.id),
                        )
                      }
                    />
                  </td>
                  <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  <td>{formatDisplayDate(task.due_date)}</td>
                  <td>{task.candidate || '—'}</td>
                  <td>{task.client || '—'}</td>
                  <td><span className={`status-pill ${task.status === 'completed' ? 'status-pill--active' : ''}`}>{task.status}</span></td>
                  <td>{task.assigned_to_name || '—'}</td>
                  <td>{formatTime(task.time_start)}</td>
                  <td>{formatTime(task.time_end)}</td>
                  <td>
                    {task.file_url ? (
                      <button
                        className="button users-icon-btn"
                        type="button"
                        title="Download file"
                        onClick={() => void handleDownloadFile(task.file_url)}
                      >
                        📎
                      </button>
                    ) : '—'}
                  </td>
                  <td>
                    {task.description ? (
                      <button className="button users-icon-btn" type="button" title="View full description" onClick={() => setDescriptionPreview(task.description)}>
                        👁
                      </button>
                    ) : '—'}
                  </td>
                  <td>
                    <div className="roles-table__actions users-actions">
                      <button className="button users-icon-btn" title="View" onClick={() => void openEdit(task)}>👁</button>
                      <button className="button users-icon-btn" title="Edit" disabled={!canManage} onClick={() => void openEdit(task)}>✏️</button>
                      <button className="button users-icon-btn button--danger" title="Cancel" disabled={!canManage} onClick={() => setDeleteTarget(task)}>🗑</button>
                      <button className="button users-icon-btn" title={task.assigned_to_id ? 'Reassign' : 'Assign'} disabled={!task.can_assign || !canManage} onClick={() => void openAssign(task)}>👤</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <div className="users-pagination">
        <button className="button" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}>
          Prev
        </button>
        <div className="users-pagination__pages">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <button key={page} className={`button ${page === currentPage ? 'button--primary' : ''}`} onClick={() => setCurrentPage(page)}>
              {page}
            </button>
          ))}
        </div>
        <button className="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}>
          Next
        </button>
      </div>

      {isFormOpen ? (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 'min(980px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 className="modal-title" style={{ marginBottom: 0 }}>{formMode === 'create' ? 'Create New Task' : 'Edit Task'}</h3>
              <button className="button" type="button" onClick={() => setIsFormOpen(false)} aria-label="Close task modal">
                ✕
              </button>
            </div>
            <div className="modal-form" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <SearchableSelect
                label="Client"
                required
                value={formState.client_id}
                placeholder="Select Client Company"
                options={clientOptions}
                error={formErrors.client_id}
                onChange={(selectedId) => {
                  setFormState((prev) => ({ ...prev, client_id: selectedId, poc_id: null, candidate_id: null }))
                  setPocs([])
                  setCandidates([])
                  if (selectedId) void loadClientDependentOptions(selectedId)
                }}
              />
              <SearchableSelect
                label="Point of contact"
                required
                disabled={!formState.client_id}
                loading={loadingPocs}
                value={formState.poc_id}
                placeholder="Select Point of Contact"
                options={pocOptions}
                error={formErrors.poc_id}
                onChange={(selectedId) => setFormState((prev) => ({ ...prev, poc_id: selectedId }))}
              />
              <SearchableSelect
                label="Candidate Name"
                required
                disabled={!formState.client_id}
                loading={loadingCandidates}
                value={formState.candidate_id}
                placeholder="Select Candidate"
                options={candidateOptions}
                error={formErrors.candidate_id}
                onChange={(selectedId) => setFormState((prev) => ({ ...prev, candidate_id: selectedId }))}
              />
              <label className="auth-card__field">
                Due Date <span className="auth-card__error">*</span>
                <input className={formErrors.due_date ? 'field-error' : ''} type="date" min={todayString()} value={formState.due_date} onChange={(event) => setFormState((prev) => ({ ...prev, due_date: event.target.value }))} />
                {formErrors.due_date ? <small className="auth-card__error">{formErrors.due_date}</small> : null}
              </label>
              <label className="auth-card__field">
                Start Time <span className="auth-card__error">*</span>
                <input className={formErrors.start_time ? 'field-error' : ''} type="time" value={formState.start_time} onChange={(event) => setFormState((prev) => ({ ...prev, start_time: event.target.value }))} />
                {formErrors.start_time ? <small className="auth-card__error">{formErrors.start_time}</small> : null}
              </label>
              <label className="auth-card__field">
                End Time (AUTO)
                <input type="time" readOnly value={formState.end_time} />
              </label>
              <SearchableSelect
                label="Task Type"
                required
                value={formState.task_type_id}
                placeholder="Select Task Type"
                options={taskTypeOptions}
                error={formErrors.task_type_id}
                onChange={(selectedId) => setFormState((prev) => ({ ...prev, task_type_id: selectedId }))}
              />
              <label className="auth-card__field">
                Status
                <input value="Pending" readOnly />
              </label>
              <label className="auth-card__field">
                Subject Line <span className="auth-card__error">*</span>
                <input maxLength={255} className={formErrors.title ? 'field-error' : ''} value={formState.title} onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))} />
                {formErrors.title ? <small className="auth-card__error">{formErrors.title}</small> : null}
              </label>
              <label className="auth-card__field">
                Duration <span className="auth-card__error">*</span> (mins)
                <input className={formErrors.duration ? 'field-error' : ''} type="number" min={1} max={500} value={formState.duration} onChange={(event) => setFormState((prev) => ({ ...prev, duration: Number(event.target.value) }))} />
                {formErrors.duration ? <small className="auth-card__error">{formErrors.duration}</small> : null}
              </label>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="auth-card__field">
                  Task Description <span className="auth-card__error">*</span>
                </label>
                <div className="card" style={{ padding: 0 }}>
                  <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #e5e7eb', padding: 8, flexWrap: 'wrap' }}>
                    <button className="button" type="button" onClick={() => execEditorCommand('bold')}>B</button>
                    <button className="button" type="button" onClick={() => execEditorCommand('italic')}>I</button>
                    <button className="button" type="button" onClick={() => execEditorCommand('insertUnorderedList')}>• List</button>
                    <button className="button" type="button" onClick={() => execEditorCommand('insertOrderedList')}>1. List</button>
                    <button className="button" type="button" onClick={() => execEditorCommand('createLink', window.prompt('Enter URL') ?? '')}>Link</button>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => setFormState((prev) => ({ ...prev, description: editorRef.current?.innerHTML ?? '' }))}
                    style={{ minHeight: 140, padding: 10, outline: 'none' }}
                  />
                </div>
                {formErrors.description ? <small className="auth-card__error">{formErrors.description}</small> : null}
              </div>

              <label className="auth-card__field">
                Decided Amt INR <span className="auth-card__error">*</span>
                <input type="number" min={0} className={formErrors.total_amount ? 'field-error' : ''} value={formState.total_amount} onChange={(event) => setFormState((prev) => ({ ...prev, total_amount: event.target.value }))} placeholder="Enter amount" />
                {formErrors.total_amount ? <small className="auth-card__error">{formErrors.total_amount}</small> : null}
              </label>
              <label className="auth-card__field">
                Payment Status
                <input value="Pending" readOnly />
              </label>
              <label className="auth-card__field" style={{ gridColumn: '1 / -1' }}>
                File Upload (Optional)
                <input
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    setFormState((prev) => ({ ...prev, attachment: file }))
                  }}
                />
                <small className="card-text">
                  {formState.attachment
                    ? `Selected: ${formState.attachment.name}`
                    : 'No file selected'}
                </small>
              </label>
            </div>
            {formError ? <p className="auth-card__error">{formError}</p> : null}
            <div className="modal-actions">
              <button className="button" onClick={() => setIsFormOpen(false)}>Cancel</button>
              <button className="button button--primary" disabled={isSubmitting} onClick={() => void handleSave()}>{isSubmitting ? 'Saving...' : 'Submit'}</button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="modal-overlay"><div className="modal-card"><h3 className="modal-title">Delete Task</h3><p className="card-text">Are you sure you want to delete this task?</p><div className="modal-actions"><button className="button" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="button button--danger" onClick={() => void handleDelete()} disabled={actionTaskId === deleteTarget.id}>{actionTaskId === deleteTarget.id ? 'Deleting...' : 'Delete'}</button></div></div></div>
      ) : null}

      {assignTarget || isBulkAssign ? (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 'min(700px, 100%)' }}>
            <h3 className="modal-title">{isBulkAssign ? 'Bulk Assign Tasks' : assignTarget?.assigned_to_id ? 'Reassign Task' : 'Assign Task'}</h3>
            {assignTarget?.assigned_to_id ? <label className="auth-card__field" style={{ marginBottom: 8 }}>Reassign reason (required)<input value={reassignReason} onChange={(event) => setReassignReason(event.target.value)} /></label> : null}
            {assignLoading ? <p className="card-text">Loading experts...</p> : (
              <table className="roles-table"><thead><tr><th>Expert Name</th><th>Status</th><th>Action</th></tr></thead><tbody>{experts.map((expert) => { const availability = checkAvailability(expert.id); return <tr key={expert.id}><td>{expert.name}</td><td><span className={`status-pill ${availability === 'available' ? 'status-pill--active' : 'status-pill--inactive'}`}>{availability}</span></td><td><button className="button" disabled={availability === 'busy'} onClick={() => setSelectedExpertId(expert.id)}>{selectedExpertId === expert.id ? 'Selected' : 'Select'}</button></td></tr> })}</tbody></table>
            )}
            {assignError ? <p className="auth-card__error">{assignError}</p> : null}
            <div className="modal-actions"><button className="button" onClick={() => { setAssignTarget(null); setIsBulkAssign(false) }}>Cancel</button><button className="button button--primary" onClick={() => void handleAssign()} disabled={Boolean(assignTarget?.id) && actionTaskId === assignTarget?.id}>{Boolean(assignTarget?.id) && actionTaskId === assignTarget?.id ? 'Submitting...' : isBulkAssign ? 'Assign Selected' : assignTarget?.assigned_to_id ? 'Reassign' : 'Assign'}</button></div>
          </div>
        </div>
      ) : null}

      {descriptionPreview ? (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 'min(680px, 100%)', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 className="modal-title" style={{ marginBottom: 0 }}>Task Description</h3>
              <button className="button" type="button" onClick={() => setDescriptionPreview(null)}>✕</button>
            </div>
            <div className="card" dangerouslySetInnerHTML={{ __html: descriptionPreview }} />
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default TasksPage
