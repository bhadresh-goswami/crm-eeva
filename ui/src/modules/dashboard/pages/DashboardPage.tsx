import { useAuth } from '../../../context/AuthContext'
import { getDashboardByRole } from '../utils/getDashboardByRole'

const DashboardPage = () => {
  const { user } = useAuth()
  const DashboardComponent = getDashboardByRole(user.role)

  return <DashboardComponent />
}

export default DashboardPage
