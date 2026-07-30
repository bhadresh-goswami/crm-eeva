import ManagerWorkspaceHeader from './ManagerWorkspaceHeader'
import { useAuth } from '../../context/AuthContext'

const sessionBreakLabel: Record<string, string> = {
  logged_in: 'Active',
  break: 'On Break',
  logged_out: 'Logged Out',
}

const getRoleLabel = (role?: string) => {
  const normalizedRole = String(role ?? '').trim().toLowerCase()
  if (normalizedRole === 'expertlead') return 'Technical Lead'
  if (normalizedRole === 'technical expert') return 'Technical Expert'
  return 'Expert'
}

type ExpertWorkspaceHeaderProps = {
  title?: string
}

const ExpertWorkspaceHeader = ({ title = 'Welcome back, focus on delivery and quality.' }: ExpertWorkspaceHeaderProps) => {
  const { user, sessionStatus } = useAuth()

  return (
    <ManagerWorkspaceHeader
      eyebrow="Technical Expert Workspace"
      title={title}
      breakStatusLabel={sessionBreakLabel[sessionStatus] ?? 'Active'}
      roleLabel={getRoleLabel(user?.role)}
    />
  )
}

export default ExpertWorkspaceHeader
