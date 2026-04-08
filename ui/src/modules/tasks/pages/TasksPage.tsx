import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import {
  assignTask,
  createTask,
  deleteTask,
  getExperts,
  getTasks,
  updateTask,
  type ExpertRecord,
  type TaskPayload,
  type TaskRecord,
} from '../api/tasksApi'

type TaskFormState = {
  client_id: string
  candidate: string
  poc: string
  task_type_id: string
  title: string
  description: string
  due_date: string
  time_start: string
  time_end: string
  total_amount: string
  payment_mode: string
}

const defaultForm: TaskFormState = {
  client_id: '',
  candidate: '',
  poc: '',
  task_type_id: '',
  title: '',
  description: '',
  due_date: '',
  time_start: '',
  time_end: '',
  total_amount: '0',
  payment_mode: '',
}

const toLocalDateTimeInput = (value: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const normalizeError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message.trim() : fallback
  if (!message || message.startsWith('<') || message.toLowerCase().includes('unexpected token')) {
    return fallback
  }
  return message
}

const formatDisplayDate = (value: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const TasksPage = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<TaskRecord[]>([])
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
  const [formError, setFormError] = useState<string | null>(null)
  const [activeTask, setActiveTask] = useState<TaskRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<TaskRecord | null>(null)
  const [actionTaskId, setActionTaskId] = useState<number | null>(null)

  const [assignTarget, setAssignTarget] = useState<TaskRecord | null>(null)
  const [experts, setExperts] = useState<ExpertRecord[]>([])
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignLoading, setAssignLoading] = useState(false)
  const [selectedExpertId, setSelectedExpertId] = useState<number | null>(null)
  const [reassignReason, setReassignReason] = useState('')

  const canManage = user?.role === 'manager' || user?.role === 'coordinator'

  const showSuccess = useCallback((message: string) => {
    setSuccess(message)
    setTimeout(() => setSuccess(null), 2500)
  }, [])

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTasks()
      setTasks(data)
    } catch (err) {
      setError(normalizeError(err, 'Failed to load tasks.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const clientOptions = useMemo(
    () => [...new Set(tasks.map((task) => task.client).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [tasks],
  )
  const taskTypeOptions = useMemo(
    () =>
      [...new Map(tasks.filter((task) => task.task_type_id).map((task) => [task.task_type_id as number, task.task_type]))]
        .map(([id, name]) => ({ id, name: name || `Type ${id}` }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [tasks],
  )

  const assigneeOptions = useMemo(
    () => [...new Set(tasks.map((task) => task.assigned_to_name).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [tasks],
  )

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

  const buildPayload = (state: TaskFormState): TaskPayload => ({
    client_id: Number(state.client_id),
    candidate: state.candidate.trim(),
    poc: state.poc.trim(),
    task_type_id: Number(state.task_type_id),
    title: state.title.trim(),
    description: state.description.trim(),
    due_date: new Date(state.due_date).toISOString(),
    time_start: state.time_start,
    time_end: state.time_end,
    total_amount: Number(state.total_amount),
    payment_mode: state.payment_mode.trim(),
  })

  const validateForm = (state: TaskFormState) => {
    if (!state.client_id) return 'Client is required.'
    if (!state.task_type_id) return 'Task type is required.'
    if (!state.title.trim()) return 'Title is required.'

    const dueDate = new Date(state.due_date)
    if (!state.due_date || Number.isNaN(dueDate.getTime())) return 'Due date is required.'
    if (dueDate.getTime() <= Date.now()) return 'Due date must be in the future.'

    if (!state.time_start || !state.time_end) return 'Start and end times are required.'
    if (state.time_start >= state.time_end) return 'Time start must be before time end.'

    const amount = Number(state.total_amount)
    if (Number.isNaN(amount) || amount < 0) return 'Total amount must be greater than or equal to 0.'

    return null
  }

  const openCreate = () => {
    setFormMode('create')
    setFormState(defaultForm)
    setFormError(null)
    setActiveTask(null)
    setIsFormOpen(true)
  }

  const openEdit = (task: TaskRecord) => {
    setFormMode('edit')
    setActiveTask(task)
    setFormError(null)
    setFormState({
      client_id: String(task.client_id ?? ''),
      candidate: task.candidate,
      poc: task.poc,
      task_type_id: String(task.task_type_id ?? ''),
      title: task.title,
      description: task.description,
      due_date: toLocalDateTimeInput(task.due_date),
      time_start: task.time_start,
      time_end: task.time_end,
      total_amount: String(task.total_amount),
      payment_mode: task.payment_mode,
    })
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    const validation = validateForm(formState)
    if (validation) {
      setFormError(validation)
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      const payload = buildPayload(formState)
      if (formMode === 'create') {
        await createTask(payload)
        showSuccess('Task created successfully.')
      } else if (activeTask) {
        await updateTask({ ...payload, id: activeTask.id })
        showSuccess('Task updated successfully.')
      }
      setIsFormOpen(false)
      await loadTasks()
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
      await deleteTask(deleteTarget.id)
      setDeleteTarget(null)
      showSuccess('Task deleted successfully.')
      await loadTasks()
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
          new Date(task.due_date).toDateString() === new Date(assignTarget.due_date).toDateString() &&
          task.time_start === assignTarget.time_start &&
          task.time_end === assignTarget.time_end,
      )

      return blockingTask ? 'busy' : 'available'
    },
    [assignTarget, tasks],
  )

  const openAssign = async (task: TaskRecord) => {
    setAssignTarget(task)
    setSelectedExpertId(null)
    setReassignReason('')
    setAssignError(null)
    setAssignLoading(true)
    try {
      const allExperts = await getExperts()
      setExperts(allExperts)
    } catch (err) {
      setAssignError(normalizeError(err, 'Failed to load experts.'))
    } finally {
      setAssignLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!assignTarget || !selectedExpertId) {
      setAssignError('Please select an expert.')
      return
    }

    if (assignTarget.assigned_to_id && !reassignReason.trim()) {
      setAssignError('Reassign reason is required.')
      return
    }

    setAssignError(null)
    setActionTaskId(assignTarget.id)

    try {
      await assignTask({
        task_id: assignTarget.id,
        expert_id: selectedExpertId,
        reason: assignTarget.assigned_to_id ? reassignReason.trim() : undefined,
      })
      setAssignTarget(null)
      showSuccess(assignTarget.assigned_to_id ? 'Task reassigned successfully.' : 'Task assigned successfully.')
      await loadTasks()
    } catch (err) {
      setAssignError(normalizeError(err, 'Failed to assign task.'))
    } finally {
      setActionTaskId(null)
    }
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
            {clientOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-card__field">
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All</option>
            {['pending', 'assigned', 'in_progress', 'completed', 'cancelled'].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-card__field">
          Assign To
          <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
            <option value="">All</option>
            {assigneeOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card clients-table__wrapper">
        {loading ? (
          <p className="users-loader">Loading tasks...</p>
        ) : filteredTasks.length === 0 ? (
          <p className="users-empty">No tasks found.</p>
        ) : (
          <table className="roles-table users-table" style={{ minWidth: 1500 }}>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const overdue = new Date(task.due_date).getTime() < Date.now() && task.status !== 'completed'
                return (
                  <tr key={task.id} style={overdue ? { backgroundColor: '#fff7ed' } : undefined}>
                    <td>{formatDisplayDate(task.due_date)}</td>
                    <td>{task.candidate || '—'}</td>
                    <td>{task.client || '—'}</td>
                    <td>
                      <span className={`status-pill ${task.status === 'completed' ? 'status-pill--active' : ''}`}>
                        {task.status}
                      </span>
                    </td>
                    <td>{task.assigned_to_name || '—'}</td>
                    <td>{task.time_start || '—'}</td>
                    <td>{task.time_end || '—'}</td>
                    <td>{task.file_url ? <a href={task.file_url}>View</a> : '—'}</td>
                    <td>{task.description || '—'}</td>
                    <td>
                      <div className="roles-table__actions users-actions">
                        <button className="button" onClick={() => window.alert(JSON.stringify(task, null, 2))}>
                          View
                        </button>
                        <button className="button" disabled={!canManage} onClick={() => openEdit(task)}>
                          Edit
                        </button>
                        <button className="button button--danger" disabled={!canManage} onClick={() => setDeleteTarget(task)}>
                          Delete
                        </button>
                        <button className="button" disabled={!task.can_assign} onClick={() => void openAssign(task)}>
                          {task.assigned_to_id ? 'Reassign' : 'Assign'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {isFormOpen ? (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 'min(760px, 100%)' }}>
            <h3 className="modal-title">{formMode === 'create' ? 'Add Task' : 'Edit Task'}</h3>
            <div className="modal-form" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="auth-card__field">
                Client
                <select
                  value={formState.client_id}
                  onChange={(event) => setFormState((prev) => ({ ...prev, client_id: event.target.value }))}
                >
                  <option value="">Select client</option>
                  {tasks
                    .filter((task) => task.client_id)
                    .map((task) => ({ id: task.client_id as number, name: task.client || `Client ${task.client_id}` }))
                    .filter((item, index, array) => array.findIndex((x) => x.id === item.id) === index)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="auth-card__field">
                Candidate
                <input
                  value={formState.candidate}
                  onChange={(event) => setFormState((prev) => ({ ...prev, candidate: event.target.value }))}
                />
              </label>
              <label className="auth-card__field">
                POC
                <input value={formState.poc} onChange={(event) => setFormState((prev) => ({ ...prev, poc: event.target.value }))} />
              </label>
              <label className="auth-card__field">
                Task Type
                <select
                  value={formState.task_type_id}
                  onChange={(event) => setFormState((prev) => ({ ...prev, task_type_id: event.target.value }))}
                >
                  <option value="">Select type</option>
                  {taskTypeOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="auth-card__field">
                Title
                <input value={formState.title} onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))} />
              </label>
              <label className="auth-card__field">
                Description
                <input
                  value={formState.description}
                  onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
              <label className="auth-card__field">
                Due Date
                <input
                  type="datetime-local"
                  value={formState.due_date}
                  onChange={(event) => setFormState((prev) => ({ ...prev, due_date: event.target.value }))}
                />
              </label>
              <label className="auth-card__field">
                Time Start
                <input
                  type="time"
                  value={formState.time_start}
                  onChange={(event) => setFormState((prev) => ({ ...prev, time_start: event.target.value }))}
                />
              </label>
              <label className="auth-card__field">
                Time End
                <input
                  type="time"
                  value={formState.time_end}
                  onChange={(event) => setFormState((prev) => ({ ...prev, time_end: event.target.value }))}
                />
              </label>
              <label className="auth-card__field">
                Total Amount
                <input
                  type="number"
                  min={0}
                  value={formState.total_amount}
                  onChange={(event) => setFormState((prev) => ({ ...prev, total_amount: event.target.value }))}
                />
              </label>
              <label className="auth-card__field" style={{ gridColumn: '1 / -1' }}>
                Payment Mode
                <input
                  value={formState.payment_mode}
                  onChange={(event) => setFormState((prev) => ({ ...prev, payment_mode: event.target.value }))}
                />
              </label>
            </div>
            {formError ? <p className="auth-card__error">{formError}</p> : null}
            <div className="modal-actions">
              <button className="button" onClick={() => setIsFormOpen(false)}>
                Cancel
              </button>
              <button className="button button--primary" disabled={isSubmitting} onClick={() => void handleSave()}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">Delete Task</h3>
            <p className="card-text">Are you sure you want to delete this task?</p>
            <div className="modal-actions">
              <button className="button" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="button button--danger" onClick={() => void handleDelete()} disabled={actionTaskId === deleteTarget.id}>
                {actionTaskId === deleteTarget.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {assignTarget ? (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 'min(700px, 100%)' }}>
            <h3 className="modal-title">{assignTarget.assigned_to_id ? 'Reassign Task' : 'Assign Task'}</h3>
            {assignTarget.assigned_to_id ? (
              <label className="auth-card__field" style={{ marginBottom: '0.75rem' }}>
                Reassign reason (required)
                <input value={reassignReason} onChange={(event) => setReassignReason(event.target.value)} />
              </label>
            ) : null}
            {assignLoading ? (
              <p className="card-text">Loading experts...</p>
            ) : (
              <table className="roles-table">
                <thead>
                  <tr>
                    <th>Expert Name</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {experts.map((expert) => {
                    const availability = checkAvailability(expert.id)
                    return (
                      <tr key={expert.id}>
                        <td>{expert.name}</td>
                        <td>
                          <span className={`status-pill ${availability === 'available' ? 'status-pill--active' : 'status-pill--inactive'}`}>
                            {availability}
                          </span>
                        </td>
                        <td>
                          <button
                            className="button"
                            disabled={availability === 'busy'}
                            onClick={() => setSelectedExpertId(expert.id)}
                            style={selectedExpertId === expert.id ? { borderColor: '#111827', fontWeight: 700 } : undefined}
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            {assignError ? <p className="auth-card__error">{assignError}</p> : null}
            <div className="modal-actions">
              <button className="button" onClick={() => setAssignTarget(null)}>
                Cancel
              </button>
              <button className="button button--primary" onClick={() => void handleAssign()} disabled={actionTaskId === assignTarget.id}>
                {actionTaskId === assignTarget.id ? 'Submitting...' : assignTarget.assigned_to_id ? 'Reassign' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default TasksPage
