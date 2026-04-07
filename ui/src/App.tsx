import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './app/AppLayout'
import DashboardPage from './pages/DashboardPage'
import TasksPage from './pages/TasksPage'

const App = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
