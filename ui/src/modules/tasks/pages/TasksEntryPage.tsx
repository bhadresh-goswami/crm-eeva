import { useAuth } from '../../../context/AuthContext'
import ExpertTasksPage from './ExpertTasksPage'
import TasksPage from './TasksPage'

const TasksEntryPage = () => {
  const { user } = useAuth()

  if (user?.role === 'expert' || user?.role === 'expertlead') {
    return <ExpertTasksPage />
  }

  return <TasksPage />
}

export default TasksEntryPage
