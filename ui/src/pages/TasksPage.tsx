import { useEffect, useState } from 'react'
import { getTasks } from '../api/tasksApi'
import type { Task } from '../types/task'

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    const loadTasks = async () => {
      const data = await getTasks()
      setTasks(data)
    }

    void loadTasks()
  }, [])

  return (
    <section>
      <h2 className="page-title">Tasks</h2>
      <p className="page-description">Manage your daily CRM tasks and monitor progress.</p>
      <div className="card">
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.title}</td>
                <td>{task.status}</td>
                <td>{task.dueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default TasksPage
