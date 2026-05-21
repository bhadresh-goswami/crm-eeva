import { useEffect, useState } from 'react'
import { getTaskComments, type TaskCommentItem } from '../../modules/tasks/api/taskCommentsApi'
import { formatDualTimezone } from '../../utils/timezone'

type TaskCommentsPanelProps = {
  taskId: number | null
  refreshKey?: number
}

const formatDateTime = (value: string) => {
  if (!value) return '—'
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return formatDualTimezone(date)
}

const TaskCommentsPanel = ({ taskId, refreshKey = 0 }: TaskCommentsPanelProps) => {
  const [comments, setComments] = useState<TaskCommentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadComments = async () => {
      if (!taskId) {
        setComments([])
        return
      }

      try {
        setLoading(true)
        setError(null)
        const items = await getTaskComments(taskId)
        if (mounted) setComments(items)
      } catch {
        if (mounted) setError('Unable to load comments right now.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadComments()

    return () => {
      mounted = false
    }
  }, [taskId, refreshKey])

  return (
    <section className="task-details-modal__section task-details-modal__section--comments">
      <h4 className="task-details-modal__section-title">Comments &amp; Activity</h4>
      <div className="task-comments-panel">
        {loading ? <p className="task-details-modal__empty">Loading comments...</p> : null}
        {!loading && error ? <p className="task-details-modal__empty">{error}</p> : null}
        {!loading && !error && comments.length === 0 ? <p className="task-details-modal__empty">No comments available</p> : null}
        {!loading && !error && comments.length > 0
          ? comments.map((comment) => (
              <article key={comment.id} className="task-comment-item">
                <div className="task-comment-item__head">
                  <strong>{comment.user_name || 'Unknown User'}</strong>
                  <span>{formatDateTime(comment.created_at)}</span>
                </div>
                <p>{comment.comment || '—'}</p>
              </article>
            ))
          : null}
      </div>
    </section>
  )
}

export default TaskCommentsPanel
