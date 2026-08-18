import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BsDownload, BsEye, BsPencil, BsPersonPlus, BsSearch, BsCalendarCheck, BsClock, BsCheckCircle, BsXCircle, BsHourglassSplit, BsPaperclip, BsFunnel } from 'react-icons/bs'
import './TasksPage.css'
import { getClients, type ClientItem } from '../../clients/api/clientsApi'
import { useAuth } from '../../../context/AuthContext'
import { apiFetch } from '../../../api/client'
import { useAlert } from '../../../shared/alerts/useAlert'
import AssignTaskModal from '../../../shared/components/AssignTaskModal'
import ManagerWorkspaceHeader from '../../../shared/components/ManagerWorkspaceHeader'
import {
  assignTask,
  bulkAssignTasks,
  bulkCancelTasks,
  cancelTask,
  checkTaskUpdates,
  createTask,
  getCandidatesByClient,
  getExperts,
  getPocsByClient,
  getTaskFilterOptions,
  getTaskDetail,
  getTaskSummary,
  getTaskPage,
  getTasksLastUpdate,
  moveTaskToPending,
  updateTask,
  type CandidateOption,
  type ExpertRecord,
  type PocOption,
  type TaskPayload,
  type TaskRecord,
  type TaskTypeOption,
  type TaskSummary,
  searchCandidates,
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

type SortDirection = 'asc' | 'desc'
type SortableTaskKey = 'id' | 'due_date' | 'candidate' | 'client' | 'status' | 'assigned_to_name' | 'time_start' | 'time_end' | 'description'
type SortConfig = { key: SortableTaskKey; direction: SortDirection }

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
const formatTime = (value: string) => {
  if (!value) return '—'
  const normalized = value.length >= 5 ? value.slice(0, 5) : value
  const date = new Date(`1970-01-01T${normalized}:00`)
  if (Number.isNaN(date.getTime())) return normalized
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
}
const normalizeTimeValue = (value: string) => (value ? value.slice(0, 5) : '')

// Assignment is the source of truth for manager list presentation. Some legacy
// task rows retain a Pending status_id after an assignment has been created.
const getTaskDisplayStatus = (task: TaskRecord) => {
  const status = task.status.replace(' ', '_').toLowerCase()
  if (status === 'pending' && (task.assigned_to_id || task.assigned_to_name.trim())) {
    return 'assigned'
  }
  return status
}
const toMinutes = (value: string) => {
  if (!value) return null
  const [hour, minute] = value.slice(0, 5).split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return hour * 60 + minute
}

const hasTimeOverlap = (startA: string, endA: string, startB: string, endB: string) => {
  const aStart = toMinutes(startA)
  const aEnd = toMinutes(endA)
  const bStart = toMinutes(startB)
  const bEnd = toMinutes(endB)
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false
  return aStart < bEnd && bStart < aEnd
}

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

const SORT_STORAGE_KEY = 'tasks_sort_config'

const toApiPayload = (state: TaskFormState): TaskPayload => ({
  client_id: state.client_id ?? 0,
  poc_id: state.poc_id ?? 0,
  candidate_id: state.candidate_id ?? 0,
  task_type_id: state.task_type_id ?? 0,
  title: state.title.trim(),
  description: state.description,
  due_date: state.due_date,
  start_time: normalizeTimeValue(state.start_time),
  end_time: normalizeTimeValue(state.end_time),
  duration: state.duration,
  total_amount: Number(state.total_amount),
  payment_mode: state.payment_mode.trim() || 'UPI',
  attachment: state.attachment,
})

const TasksPage = () => {
  const { user } = useAuth()
  const normalizedRole = (user?.role ?? '').toLowerCase()
  const isTechExpert = normalizedRole === 'expert' || normalizedRole === 'technical expert'
  const { showToast, showAlert } = useAlert()
  const editorRef = useRef<HTMLDivElement | null>(null)
  const canManage = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'coordinator'
  const canEditPrice = user?.role === 'admin' || user?.role === 'manager'

  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [cancelledTasks, setCancelledTasks] = useState<TaskRecord[]>([])
  const [clients, setClients] = useState<ClientItem[]>([])
  const [taskTypes, setTaskTypes] = useState<TaskTypeOption[]>([])
  const [pocs, setPocs] = useState<PocOption[]>([])
  const [candidates, setCandidates] = useState<CandidateOption[]>([])
  const [loadingPocs, setLoadingPocs] = useState(false)
  const [loadingCandidates, setLoadingCandidates] = useState(false)

  const [loading, setLoading] = useState(true)
  const [loadingFilters, setLoadingFilters] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [candidateFilter, setCandidateFilter] = useState<number | null>(null)
  const [companyFilter, setCompanyFilter] = useState<number | null>(null)
  const [taskTypeFilter, setTaskTypeFilter] = useState<number | null>(null)
  const [assigneeFilter, setAssigneeFilter] = useState<number | null>(null)
  // Managers land on actionable assigned work, matching the legacy workspace and
  // avoiding an empty first view when there are no currently pending tasks.
  const [activeSection, setActiveSection] = useState('assigned')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [taskIdFilter, setTaskIdFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detailsTask, setDetailsTask] = useState<TaskRecord | null>(null)
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null)
  const [filterCompanies, setFilterCompanies] = useState<Array<{id:number;name:string}>>([])
  const [filterAssignees, setFilterAssignees] = useState<Array<{ id: number; name: string }>>([])
  const [filterCandidates, setFilterCandidates] = useState<Array<{ id: number; name: string }>>([])
  const [summary, setSummary] = useState<TaskSummary>({pending:0,in_progress:0,assigned:0,completed:0,cancelled:0})
  const [totalTasks, setTotalTasks] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const listAbortRef = useRef<AbortController | null>(null)
  const detailCache = useRef(new Map<number, { task: TaskRecord; cachedAt: number }>())
  const [detailLoading, setDetailLoading] = useState(false)

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
  const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
    try {
      const stored = localStorage.getItem(SORT_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as SortConfig
        if (parsed?.key && (parsed.direction === 'asc' || parsed.direction === 'desc')) {
          return parsed
        }
      }
    } catch {
      // noop
    }
    return { key: 'due_date', direction: 'desc' }
  })
  const [isCancelledModalOpen, setIsCancelledModalOpen] = useState(false)
  const [statusActionTaskId, setStatusActionTaskId] = useState<number | null>(null)

  const [assignTarget, setAssignTarget] = useState<TaskRecord | null>(null)
  const [experts, setExperts] = useState<ExpertRecord[]>([])
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignSubmitting, setAssignSubmitting] = useState(false)
  const [selectedExpertId, setSelectedExpertId] = useState<number | null>(null)
  const [isBulkAssign, setIsBulkAssign] = useState(false)
  const [lastSeenTaskId, setLastSeenTaskId] = useState(0)
  const [lastKnownTaskUpdate, setLastKnownTaskUpdate] = useState<string | null>(null)
  const [announcedNewTaskIds, setAnnouncedNewTaskIds] = useState<number[]>([])
  const [announcedUpcomingTaskIds, setAnnouncedUpcomingTaskIds] = useState<number[]>([])

  const showSuccess = useCallback((message: string) => {
    setSuccess(message)
    showToast({ type: 'success', message })
    setTimeout(() => setSuccess(null), 2500)
  }, [showToast])

  const loadPage = useCallback(async () => {
    listAbortRef.current?.abort()
    const controller = new AbortController()
    listAbortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const result = await getTaskPage({ section: activeSection, page: currentPage, pageSize: rowsPerPage, search: taskIdFilter.trim() || debouncedSearch, companyId: companyFilter, candidateId: candidateFilter, taskTypeId: taskTypeFilter, assignedTo: assigneeFilter, dateFrom, dateTo, sort: sortConfig.key, direction: sortConfig.direction }, controller.signal)
      if (listAbortRef.current !== controller) return
      setTasks(result.tasks)
      setTotalTasks(result.pagination.total)
      const latestTaskId = result.tasks.reduce((max, task) => (task.id > max ? task.id : max), 0)
      setLastSeenTaskId((prev) => Math.max(prev, latestTaskId))
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(normalizeError(err, 'Failed to load tasks.'))
    } finally {
      if (listAbortRef.current === controller) setLoading(false)
    }
  }, [activeSection, assigneeFilter, candidateFilter, companyFilter, currentPage, dateFrom, dateTo, debouncedSearch, rowsPerPage, sortConfig.direction, sortConfig.key, taskIdFilter, taskTypeFilter])

  useEffect(() => {
    void loadPage()
    return () => listAbortRef.current?.abort()
  }, [loadPage])

  useEffect(() => { const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300); return () => window.clearTimeout(id) }, [search])

  useEffect(() => {
    const loadFilterOptions = async () => {
      setLoadingFilters(true)
      setFilterOptionsError(null)
      try {
        const [data, clientsData] = await Promise.all([getTaskFilterOptions(), getClients()])
        setFilterCompanies(data.companies)
        setFilterAssignees(data.assignees)
        setTaskTypes(data.task_types)
        setClients(clientsData)
      } catch (err) {
        setFilterOptionsError(normalizeError(err, 'Failed to load filter options.'))
      } finally {
        setLoadingFilters(false)
      }
    }
    void loadFilterOptions()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void getTaskSummary({ search: taskIdFilter.trim() || debouncedSearch, companyId: companyFilter, candidateId: candidateFilter, taskTypeId: taskTypeFilter, assignedTo: assigneeFilter, dateFrom, dateTo }, controller.signal).then(setSummary).catch(() => undefined)
    return () => controller.abort()
  }, [assigneeFilter, candidateFilter, companyFilter, dateFrom, dateTo, debouncedSearch, taskIdFilter, taskTypeFilter])

  useEffect(() => {
    const controller = new AbortController()
    const id = window.setTimeout(() => void searchCandidates(companyFilter, '', controller.signal).then(setFilterCandidates).catch(() => undefined), 300)
    return () => { window.clearTimeout(id); controller.abort() }
  }, [companyFilter])

  useEffect(() => {
    const nextEnd = calcEndTime(formState.start_time, formState.duration)
    setFormState((prev) => ({ ...prev, end_time: nextEnd }))
  }, [formState.start_time, formState.duration])

  useEffect(() => {
    if (!isFormOpen || !editorRef.current) return
    editorRef.current.innerHTML = formState.description || ''
  }, [isFormOpen, formMode, activeTask?.id])

  useEffect(() => {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sortConfig))
  }, [sortConfig])

  const handleSort = useCallback((key: SortableTaskKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const sortIndicator = useCallback((key: SortableTaskKey) => {
    if (sortConfig.key !== key) return '↕'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }, [sortConfig.direction, sortConfig.key])

  const sortedTasks = tasks
  const totalPages = Math.ceil(totalTasks / rowsPerPage)
  const paginatedTasks = tasks
  const pageTaskIds = paginatedTasks.map((task) => task.id)
  const isAllPageSelected = pageTaskIds.length > 0 && pageTaskIds.every((id) => selectedTaskIds.includes(id))

  useEffect(() => {
    setCurrentPage(1)
  }, [activeSection, assigneeFilter, candidateFilter, companyFilter, dateFrom, dateTo, debouncedSearch, rowsPerPage, taskIdFilter, taskTypeFilter])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages))
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    setSelectedTaskIds((prev) => prev.filter((id) => tasks.some((task) => task.id === id)))
  }, [tasks])

  const isUserBusy = isFormOpen || Boolean(descriptionPreview) || Boolean(assignTarget) || Boolean(deleteTarget) || isCancelledModalOpen

  useEffect(() => {
    if (!isTechExpert) {
      return
    }

    const interval = window.setInterval(async () => {
      if (isUserBusy) return
      try {
        const latestStamp = await getTasksLastUpdate()
        if (!latestStamp || latestStamp === lastKnownTaskUpdate) {
          return
        }

        setLastKnownTaskUpdate(latestStamp)
        await loadPage()

        const updates = await checkTaskUpdates(lastSeenTaskId, 30)
        if (updates.newTasks.length > 0) {
          const unseen = updates.newTasks.filter((task) => !announcedNewTaskIds.includes(task.id))
          if (unseen.length > 0) {
            showAlert({ title: 'New task assigned', message: `${unseen.length} new task(s) detected.` })
            setAnnouncedNewTaskIds((prev) => [...new Set([...prev, ...unseen.map((task) => task.id)])])
            setLastSeenTaskId((prev) => Math.max(prev, ...unseen.map((task) => task.id)))
          }
        }

        if (updates.upcomingTasks.length > 0) {
          const upcomingUnseen = updates.upcomingTasks.filter((task) => !announcedUpcomingTaskIds.includes(task.id))
          if (upcomingUnseen.length > 0) {
            showToast({ type: 'warning', title: 'Upcoming task', message: `${upcomingUnseen.length} task(s) are upcoming soon.` })
            setAnnouncedUpcomingTaskIds((prev) => [...new Set([...prev, ...upcomingUnseen.map((task) => task.id)])])
          }
        }
      } catch {
        // silent polling failure
      }
    }, 20_000)

    return () => window.clearInterval(interval)
  }, [announcedNewTaskIds, announcedUpcomingTaskIds, getTasksLastUpdate, isTechExpert, isUserBusy, lastKnownTaskUpdate, lastSeenTaskId, loadPage, showAlert, showToast])

  const clientOptions = useMemo(
    () => clients.map((client) => ({ id: client.id, label: client.company_name || client.name })).sort((a, b) => a.label.localeCompare(b.label)),
    [clients],
  )

  const pocOptions = useMemo(() => pocs.map((poc) => ({ id: poc.id, label: poc.name })), [pocs])
  const candidateOptions = useMemo(() => candidates.map((item) => ({ id: item.id, label: item.name })), [candidates])
  const taskTypeOptions = useMemo(() => taskTypes.map((item) => ({ id: item.id, label: item.name })), [taskTypes])

  const assigneeOptions = useMemo(() => filterAssignees, [filterAssignees])

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

    const startTime = normalizeTimeValue(task.time_start)
    const duration = task.duration || 30
    const endTime = task.time_end ? normalizeTimeValue(task.time_end) : calcEndTime(startTime, duration)

    const state: TaskFormState = {
      client_id: task.client_id,
      poc_id: task.poc_id,
      candidate_id: task.candidate_id,
      due_date: task.due_date.slice(0, 10),
      start_time: startTime,
      end_time: endTime,
      task_type_id: task.task_type_id,
      title: task.title,
      duration,
      description: task.description || '',
      total_amount: String(task.total_amount || ''),
      payment_mode: task.payment_mode || 'UPI',
      attachment: null,
    }

    setFormState(state)
    setIsFormOpen(true)

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

    const amount = Number(state.total_amount || '0')
    if (canEditPrice) {
      if (!state.total_amount.trim()) nextErrors.total_amount = 'Amount is required.'
      if (Number.isNaN(amount) || amount < 0) nextErrors.total_amount = 'Amount must be positive.'
    }

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
          task.status !== 'cancelled' &&
          hasTimeOverlap(task.time_start, task.time_end, assignTarget.time_start, assignTarget.time_end),
      )
      return blockingTask ? 'not_available' : 'available'
    },
    [assignTarget, tasks],
  )

  const openAssign = async (task?: TaskRecord) => {
    setAssignTarget(task ?? null)
    setIsBulkAssign(!task)
    setSelectedExpertId(null)
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
    if (assignTarget && checkAvailability(selectedExpertId) === 'not_available') {
      setAssignError('Selected expert is not available in this time slot.')
      return
    }

    setAssignError(null)
    setAssignSubmitting(true)
    if (assignTarget) {
      setActionTaskId(assignTarget.id)
    }
    try {
      if (isBulkAssign) {
        await bulkAssignTasks({ task_ids: selectedTaskIds, user_id: selectedExpertId })
      } else if (assignTarget) {
        const assignResponse = await assignTask({
          task_id: assignTarget.id,
          user_id: selectedExpertId,
        })
        if (assignResponse?.email_status === 'failed') {
          showToast({ type: 'warning', message: 'Task assigned but email failed.' })
        }
        const selectedExpert = experts.find((expert) => expert.id === selectedExpertId)
        if (selectedExpert) {
          setTasks((previous) =>
            previous.map((task) =>
              task.id === assignTarget.id
                ? {
                    ...task,
                    status: 'assigned',
                    assigned_to_id: selectedExpert.id,
                    assigned_to_name: selectedExpert.name,
                  }
                : task,
            ),
          )
        }
      }
      setAssignTarget(null)
      setSelectedTaskIds([])
      showSuccess(isBulkAssign ? 'Tasks assigned successfully.' : assignTarget?.assigned_to_id ? 'Task reassigned successfully.' : 'Task assigned successfully.')
      await loadPage()
    } catch (err) {
      const message = normalizeError(err, 'Failed to assign task.')
      setAssignError(message)
      showAlert({
        type: 'error',
        title: 'Assignment failed',
        message,
      })
    } finally {
      setAssignSubmitting(false)
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

  const handleMoveToPending = async (taskId: number) => {
    setStatusActionTaskId(taskId)
    setError(null)
    try {
      await moveTaskToPending(taskId)
      showSuccess('Task moved to pending.')
      await loadPage()
    } catch (err) {
      setError(normalizeError(err, 'Failed to move task to pending.'))
    } finally {
      setStatusActionTaskId(null)
    }
  }

  const handleDownloadFile = async (fileUrl: string) => {
    const filename = fileUrl.split('/').pop()
    if (!filename) return

    const response = await apiFetch(`/tasks/file?file=${encodeURIComponent(filename)}`)
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

  const openDetails = (task: TaskRecord) => {
    setDetailsTask(task)
    const cached = detailCache.current.get(task.id)
    if (cached && Date.now() - cached.cachedAt < 5 * 60_000) { setDetailsTask(cached.task); return }
    setDetailLoading(true)
    void getTaskDetail(task.id).then((detail) => { detailCache.current.set(task.id, { task: detail, cachedAt: Date.now() }); setDetailsTask((current) => current?.id === task.id ? detail : current) }).catch(() => showToast({type:'error',message:'Unable to load task details.'})).finally(() => setDetailLoading(false))
  }

  const openCancelled = async () => {
    setIsCancelledModalOpen(true)
    try { setCancelledTasks((await getTaskPage({section:'cancelled',page:1,pageSize:100})).tasks) } catch { showToast({type:'error',message:'Unable to load cancelled tasks.'}) }
  }

  const clearFilters = () => { setCandidateFilter(null);setCompanyFilter(null);setTaskTypeFilter(null);setAssigneeFilter(null);setTaskIdFilter('');setDateFrom('');setDateTo('');setSearch('') }
  const activeFilterCount = [candidateFilter, companyFilter, taskTypeFilter, assigneeFilter, taskIdFilter, dateFrom, dateTo].filter(Boolean).length
  const handleSectionChange = (section: string) => {
    setCurrentPage(1)
    setSelectedTaskIds([])
    setActiveSection(section)
  }

  return (
    <section className="task-workspace">
      {user?.role === 'manager' ? (
        <ManagerWorkspaceHeader
          title="Manage assignments and task execution."
          subtitle="Track task progress, monitor schedules, and ensure timely delivery across all coordinators and experts."
          actions={(
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="button" onClick={() => void openCancelled()}>
                Cancelled Tasks
              </button>
              {canManage ? (
                <button className="button button--primary" onClick={openCreate}>
                  + Add Task
                </button>
              ) : null}
            </div>
          )}
        />
      ) : (
        <div className="users-page__header">
          <h2 className="page-title">Task Management</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="button" onClick={() => void openCancelled()}>
              Cancelled Tasks
            </button>
            {canManage ? (
              <button className="button button--primary" onClick={openCreate}>
                + Add Task
              </button>
            ) : null}
          </div>
        </div>
      )}

      {success ? <p className="roles-success roles-feedback">{success}</p> : null}

      <nav className="task-status-tabs" aria-label="Task status sections">
        {([['pending','Pending',BsHourglassSplit],['in_progress','In Progress',BsClock],['assigned','Assigned',BsCalendarCheck],['completed','Completed',BsCheckCircle]] as const).map(([key,label,Icon]) => <button type="button" key={key} className={activeSection === key ? 'active' : ''} aria-current={activeSection === key ? 'page' : undefined} onClick={() => handleSectionChange(key)}><Icon/><span>{label}</span><strong>{summary[key]}</strong></button>)}
      </nav>

      <div className="card tasks-filters task-filter-card">
        <div className="task-filter-toolbar">
          <div className="task-search"><BsSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." aria-label="Search task, candidate, company or Task ID" /></div>
          <button type="button" className={`task-filter-trigger ${showMoreFilters ? 'is-open' : ''}`} aria-expanded={showMoreFilters} onClick={() => setShowMoreFilters((value) => !value)}><BsFunnel/> Filter {activeFilterCount > 0 ? <strong>{activeFilterCount}</strong> : null}<span>⌄</span></button>
          <button type="button" className="task-toolbar-control" onClick={() => setShowMoreFilters(true)}>Company</button>
          <button type="button" className="task-toolbar-control" onClick={() => setShowMoreFilters(true)}>Candidate</button>
          <button type="button" className="task-toolbar-control" onClick={() => setShowMoreFilters(true)}>Task Type</button>
          {activeFilterCount > 0 || search ? <button type="button" className="task-clear-toolbar" onClick={clearFilters}>Clear all</button> : null}
        </div>
        {filterOptionsError ? <small className="auth-card__error">{filterOptionsError}</small> : null}
        {showMoreFilters ? <div className="task-filter-popover"><header><div><strong>Quick filters</strong><span>Showing {totalTasks} {activeSection.replace('_',' ')} tasks</span></div><button type="button" onClick={() => setShowMoreFilters(false)} aria-label="Close filters">×</button></header><div className="task-filter-grid"><label>Company<select value={companyFilter ?? ''} onChange={(event) => {setCandidateFilter(null);setCompanyFilter(event.target.value ? Number(event.target.value) : null)}} disabled={loadingFilters}><option value="">All Companies</option>{filterCompanies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label>Candidate<select value={candidateFilter ?? ''} onChange={(event) => setCandidateFilter(event.target.value ? Number(event.target.value) : null)} disabled={loadingFilters}><option value="">All Candidates</option>{filterCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label><label>Task Type<select value={taskTypeFilter ?? ''} onChange={(event) => setTaskTypeFilter(event.target.value ? Number(event.target.value) : null)} disabled={loadingFilters}><option value="">All Task Types</option>{taskTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><label>Assigned To<select value={assigneeFilter ?? ''} onChange={(event) => setAssigneeFilter(event.target.value ? Number(event.target.value) : null)} disabled={loadingFilters}><option value="">All Experts</option>{assigneeOptions.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}</select></label><label>Task ID<input value={taskIdFilter} onChange={(event) => setTaskIdFilter(event.target.value)} placeholder="TAS-2589" /></label><label>Date From<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label>Date To<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label></div><footer><button type="button" onClick={clearFilters}>Clear all</button><button type="button" className="button button--primary" onClick={() => setShowMoreFilters(false)}>Done</button></footer></div> : null}
        {(candidateFilter || companyFilter || taskTypeFilter || assigneeFilter || taskIdFilter || dateFrom || dateTo) ? <div className="task-chips"><strong>Active filters</strong>{candidateFilter && <button onClick={() => setCandidateFilter(null)}>Candidate: {filterCandidates.find(v=>v.id===candidateFilter)?.name} ×</button>}{companyFilter && <button onClick={() => {setCompanyFilter(null);setCandidateFilter(null)}}>Company: {filterCompanies.find(v=>v.id===companyFilter)?.name} ×</button>}{taskTypeFilter && <button onClick={() => setTaskTypeFilter(null)}>Task Type: {taskTypes.find(v=>v.id===taskTypeFilter)?.name} ×</button>}{assigneeFilter && <button onClick={() => setAssigneeFilter(null)}>Expert: {assigneeOptions.find(v=>v.id===assigneeFilter)?.name} ×</button>}<button className="task-clear" onClick={clearFilters}>Clear all</button></div> : null}
      </div>

      <div className="task-summary"><div><BsHourglassSplit/><span>Total Tasks<strong>{summary.pending+summary.assigned+summary.in_progress+summary.completed}</strong></span></div><div><BsCalendarCheck/><span>Assigned<strong>{summary.assigned}</strong></span></div><div><BsClock/><span>In Progress<strong>{summary.in_progress}</strong></span></div><div><BsCheckCircle/><span>Completed<strong>{summary.completed}</strong></span></div><div><BsXCircle/><span>Cancelled<strong>{summary.cancelled}</strong></span></div></div>

      <div className="card tasks-bulk-actions task-bulk-bar">
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
          <strong>{selectedTaskIds.length}</strong> selected
        </label>
        <button className="button" disabled={!selectedTaskIds.length || !canManage} onClick={() => void openAssign()}>
          👤 Bulk Assign
        </button>
        <button className="button button--danger" disabled={!selectedTaskIds.length || !canManage} onClick={() => void handleBulkCancel()}>
          🗑 Cancel Selected
        </button>
      </div>



      <div className="card table-container tasks-table__wrapper task-list-card">
        {loading && tasks.length === 0 ? <div className="task-skeleton">{Array.from({length: 7}, (_, index) => <div key={index}><span/><span/><span/><span/><span/></div>)}</div> : null}
        {loading && tasks.length > 0 ? <div className="task-table-progress" role="status">Updating tasks…</div> : null}
        {!loading && sortedTasks.length === 0 ? <div className="task-empty"><BsSearch/><h3>No tasks match your current filters.</h3><p>Try changing the section or clearing your filters.</p><button className="button" onClick={clearFilters}>Clear Filters</button></div> : null}
        {sortedTasks.length > 0 ? (
          <div className="tasks-table-scroll">
            <table className="roles-table users-table tasks-table">
              <thead>
                <tr>
                  <th>✓</th>
                  <th>Actions</th>
                  <th><button type="button" className="table-sort" onClick={() => handleSort('id')}>SR No {sortIndicator('id')}</button></th>
                  <th>Task ID</th>
                  <th><button type="button" className="table-sort" onClick={() => handleSort('candidate')}>Candidate {sortIndicator('candidate')}</button></th>
                  <th><button type="button" className="table-sort" onClick={() => handleSort('client')}>Company {sortIndicator('client')}</button></th>
                  <th><button type="button" className="table-sort" onClick={() => handleSort('status')}>Status {sortIndicator('status')}</button></th>
                  <th><button type="button" className="table-sort" onClick={() => handleSort('assigned_to_name')}>Assign To {sortIndicator('assigned_to_name')}</button></th>
                  <th><button type="button" className="table-sort" onClick={() => handleSort('due_date')}>Due Date {sortIndicator('due_date')}</button></th>
                  <th><button type="button" className="table-sort" onClick={() => handleSort('time_start')}>Time {sortIndicator('time_start')}</button></th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTasks.map((task, index) => {
                  const isCancelled = task.status === 'cancelled'

                  return (
                    <tr key={`task-${task.id}`}>
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
                      <td>
                        <div className="roles-table__actions users-actions">
                          <button className="task-action" aria-label="View task details" title="View details" onClick={() => openDetails(task)}><BsEye /></button>
                          <button className="task-action" title="Edit" disabled={!canManage} onClick={() => void openEdit(task)}><BsPencil /></button>
                          <button className="button users-icon-btn action-btn button--danger" title="Cancel" disabled={!canManage} onClick={() => setDeleteTarget(task)}>🗑</button>
                          <button
                            className="button users-icon-btn action-btn"
                            title={
                              task.assigned_to_id || task.assigned_to_name
                                ? 'Reassign'
                                : task.status === 'pending'
                                  ? 'Assign'
                                  : 'Assign disabled'
                            }
                            disabled={!task.can_assign || !canManage || isCancelled || !['pending', 'assigned'].includes(task.status)}
                            onClick={() => void openAssign(task)}
                          >
                            👤
                          </button>
                          {task.resume_url ? (
                            <button
                              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                              type="button"
                              title="Download Resume"
                              onClick={() => window.open(task.resume_url, '_blank', 'noopener,noreferrer')}
                            >
                              <BsDownload />
                              <span>Download Resume</span>
                            </button>
                          ) : null}
                        </div>
                      </td>

                      <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>
                      <td><button className="task-id-link" onClick={() => openDetails(task)}>TAS-{task.id}</button></td>
                      <td>{task.candidate || '—'}</td>
                      <td>{task.client || '—'}</td>
                      <td>{(() => {
                        const displayStatus = getTaskDisplayStatus(task)
                        return (
                          <span className={`task-status task-status--${displayStatus}`} title={`Status: ${displayStatus.replace('_', ' ')}`} aria-label={`Status: ${displayStatus.replace('_', ' ')}`}>
                            {displayStatus === 'assigned' ? <BsCalendarCheck /> : displayStatus === 'completed' ? <BsCheckCircle /> : displayStatus === 'cancelled' ? <BsXCircle /> : ['active', 'in_progress'].includes(displayStatus) ? <BsClock /> : <BsHourglassSplit />}
                            {displayStatus.replace('_', ' ')}
                          </span>
                        )
                      })()}</td>
                      <td>{task.assigned_to_name || '—'}</td>
                      <td>{formatDisplayDate(task.due_date)}</td>
                      <td>{formatTime(task.time_start)} – {formatTime(task.time_end)}</td>
                      <td>
                        {task.file_url || task.has_attachment ? (
                          <button
                            className="button users-icon-btn action-btn"
                            type="button"
                            title={task.file_url ? 'Download file' : 'View attachment details'}
                            aria-label={task.file_url ? 'Download task attachment' : 'View task attachment details'}
                            onClick={() => task.file_url ? void handleDownloadFile(task.file_url) : openDetails(task)}
                          >
                            📎
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {totalTasks > 0 ? <footer className="task-pagination" aria-label="Task pagination"><span>Showing {(currentPage-1)*rowsPerPage+1}–{Math.min(currentPage*rowsPerPage,totalTasks)} of {totalTasks} tasks</span><label>Rows per page <select value={rowsPerPage} onChange={(event)=>setRowsPerPage(Number(event.target.value))}>{[10,25,50,100].map(size=><option key={size}>{size}</option>)}</select></label>{totalPages > 1 ? <nav><button title="Previous page" aria-label="Previous page" disabled={currentPage===1} onClick={()=>setCurrentPage(v=>v-1)}>‹</button>{Array.from(new Set([1,currentPage-1,currentPage,currentPage+1,totalPages]).values()).filter(v=>v>0&&v<=totalPages).sort((a,b)=>a-b).map((page,index,array)=><span key={page}>{index>0&&page-array[index-1]>1?<i>…</i>:null}<button aria-current={page===currentPage?'page':undefined} className={page===currentPage?'active':''} onClick={()=>setCurrentPage(page)}>{page}</button></span>)}<button title="Next page" aria-label="Next page" disabled={currentPage===totalPages} onClick={()=>setCurrentPage(v=>v+1)}>›</button></nav>:null}</footer> : null}

      {detailsTask ? <div className="task-drawer-overlay" onMouseDown={() => setDetailsTask(null)}><aside className="task-drawer" aria-label="Task details" onMouseDown={(event) => event.stopPropagation()}><header><div><small>Task Details</small><h2>TAS-{detailsTask.id}</h2></div><button aria-label="Close task details" onClick={() => setDetailsTask(null)}>×</button></header><div className="task-drawer-body">{detailLoading ? <div className="task-detail-skeleton"><span/><span/><span/><span/></div> : <><section><h3>Task overview</h3><dl><dt>Status</dt><dd>{detailsTask.status.replace('_', ' ')}</dd><dt>Task Type</dt><dd>{detailsTask.task_type || '—'}</dd><dt>Candidate</dt><dd>{detailsTask.candidate || '—'}</dd><dt>Company / Client</dt><dd>{detailsTask.client || '—'}</dd><dt>Point of Contact</dt><dd>{detailsTask.poc || '—'}</dd><dt>Assigned To</dt><dd>{detailsTask.assigned_to_name || 'Unassigned'}</dd><dt>Due Date</dt><dd>{formatDisplayDate(detailsTask.due_date)}</dd><dt>Start Time</dt><dd>{formatTime(detailsTask.time_start)}</dd><dt>End Time</dt><dd>{formatTime(detailsTask.time_end)}</dd><dt>Duration</dt><dd>{detailsTask.duration ? `${detailsTask.duration} minutes` : '—'}</dd></dl></section><section><h3>Description</h3><div className="task-description" dangerouslySetInnerHTML={{__html: detailsTask.description || '<p>No description provided.</p>'}} /></section><section><h3>Attachments ({detailsTask.file_url ? 1 : 0})</h3>{detailsTask.file_url ? <div className="task-attachment"><BsPaperclip/><strong>{detailsTask.file_url.split('/').pop()}</strong><button onClick={() => void handleDownloadFile(detailsTask.file_url)}><BsDownload/> Download</button></div> : <p>No attachments.</p>}</section></>}</div><footer><button className="button" onClick={() => void openAssign(detailsTask)}><BsPersonPlus/> Assign</button><button className="button button--primary" onClick={() => {setDetailsTask(null);void openEdit(detailsTask)}}><BsPencil/> Edit Task</button></footer></aside></div> : null}

      {isFormOpen ? (
        <div className="modal-overlay">
          <div className="modal-card modal-card--xl task-form-modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div><h3 className="modal-title" style={{ marginBottom: 0 }}>{formMode === 'create' ? 'Create New Task' : 'Edit Task'}</h3><p className="card-text">{formMode === 'create' ? 'Add task details, scheduling and assignment information.' : `TAS-${activeTask?.id}`}</p></div>
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

              {canEditPrice ? (
                <label className="auth-card__field">
                  Decided Amt INR <span className="auth-card__error">*</span>
                  <input type="number" min={0} className={formErrors.total_amount ? 'field-error' : ''} value={formState.total_amount} onChange={(event) => setFormState((prev) => ({ ...prev, total_amount: event.target.value }))} placeholder="Enter amount" />
                  {formErrors.total_amount ? <small className="auth-card__error">{formErrors.total_amount}</small> : null}
                </label>
              ) : null}
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
              <button className="button button--primary" disabled={isSubmitting} onClick={() => void handleSave()}>{isSubmitting ? (formMode === 'create' ? 'Creating...' : 'Saving...') : (formMode === 'create' ? 'Create Task' : 'Update Task')}</button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="modal-overlay"><div className="modal-card"><h3 className="modal-title">Cancel Task?</h3><p className="card-text"><strong>TAS-{deleteTarget.id}</strong> will be moved to Cancelled.</p><p className="card-text">This action may affect assignment and reporting.</p><div className="modal-actions"><button className="button" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="button button--danger" onClick={() => void handleDelete()} disabled={actionTaskId === deleteTarget.id}>{actionTaskId === deleteTarget.id ? 'Cancelling...' : 'Cancel Task'}</button></div></div></div>
      ) : null}

      <AssignTaskModal
        isOpen={Boolean(assignTarget || isBulkAssign)}
        title={isBulkAssign ? 'Bulk Assign Tasks' : assignTarget?.assigned_to_id || assignTarget?.assigned_to_name ? 'Reassign Task' : 'Assign Task'}
        experts={experts}
        loading={assignLoading}
        error={assignError}
        submitting={assignSubmitting}
        selectedExpertId={selectedExpertId}
        onSelect={(expertId) => setSelectedExpertId(Number(expertId))}
        getAvailability={(expertId) => (assignTarget ? checkAvailability(Number(expertId)) : 'available')}
        onClose={() => {
          setAssignTarget(null)
          setIsBulkAssign(false)
          setAssignError(null)
          setSelectedExpertId(null)
        }}
        onConfirm={() => void handleAssign()}
        confirmLabel={isBulkAssign ? 'Assign Selected' : assignTarget?.assigned_to_id || assignTarget?.assigned_to_name ? 'Reassign' : 'Assign'}
      />

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

      {isCancelledModalOpen ? (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 'min(1100px, 100%)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 className="modal-title" style={{ marginBottom: 0 }}>Cancelled Tasks</h3>
              <button className="button" type="button" onClick={() => setIsCancelledModalOpen(false)}>✕</button>
            </div>
            {cancelledTasks.length === 0 ? <p className="users-empty">No cancelled tasks found.</p> : (
              <div className="tasks-table__wrapper tasks-table__wrapper--modal">
                <div className="tasks-table-scroll">
                <table className="roles-table users-table tasks-table" style={{ minWidth: 1650, whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Candidate</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Assign To</th>
                      <th>Time Start</th>
                      <th>Time End</th>
                      <th>File</th>
                      <th>Description</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cancelledTasks.map((task) => (
                      <tr key={`task-${task.id}`}>
                        <td>{formatDisplayDate(task.due_date)}</td>
                        <td>{task.candidate || '—'}</td>
                        <td>{task.client || '—'}</td>
                        <td><span className="status-pill status-pill--inactive">{task.status}</span></td>
                        <td>{task.assigned_to_name || '—'}</td>
                        <td>{formatTime(task.time_start)}</td>
                        <td>{formatTime(task.time_end)}</td>
                        <td>
                          {task.file_url ? (
                            <button className="button users-icon-btn action-btn" type="button" title="Download file" onClick={() => void handleDownloadFile(task.file_url)}>
                              📎
                            </button>
                          ) : '—'}
                        </td>
                        <td>
                          {task.description ? (
                            <button className="button users-icon-btn action-btn" type="button" title="View full description" onClick={() => setDescriptionPreview(task.description)}>
                              👁
                            </button>
                          ) : '—'}
                        </td>
                        <td>
                          <button
                            className="button button--primary users-icon-btn action-btn"
                            disabled={statusActionTaskId === task.id}
                            title={statusActionTaskId === task.id ? 'Updating task status' : 'Move task to pending'}
                            aria-label={statusActionTaskId === task.id ? 'Updating task status' : 'Move task to pending'}
                            onClick={() => void handleMoveToPending(task.id)}
                          >
                            {statusActionTaskId === task.id ? '⏳' : '↩️'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="modal-overlay" role="alertdialog" aria-modal="true" aria-labelledby="tasks-error-title">
          <div className="modal-card" style={{ width: 'min(520px, 100%)' }}>
            <h3 id="tasks-error-title" className="modal-title">Error</h3>
            <p className="card-text">{error}</p>
            <div className="modal-actions">
              <button className="button button--primary" type="button" onClick={() => setError(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default TasksPage
