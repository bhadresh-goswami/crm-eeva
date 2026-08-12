import ManagerWorkspaceHeader from './ManagerWorkspaceHeader'
import { useAuth } from '../../context/AuthContext'

const sessionBreakLabel: Record<string, string> = { logged_in: 'Active', break: 'On Break', logged_out: 'Logged Out' }

const getRoleLabel = (role?: string) => String(role ?? '').trim().toLowerCase() === 'expertlead' ? 'Technical Lead' : 'Technical Expert'

type ExpertWorkspaceHeaderProps = {
  title?: string
  compact?: boolean
}

const ExpertWorkspaceHeader = ({ title = 'Welcome back, focus on delivery and quality.', compact = false }: ExpertWorkspaceHeaderProps) => {
  const { user, sessionStatus } = useAuth()
  return (
    <ManagerWorkspaceHeader
      eyebrow="Technical Expert Workspace"
      title={title}
      compact={compact}
      breakStatusLabel={sessionBreakLabel[sessionStatus] ?? 'Active'}
      roleLabel={getRoleLabel(user?.role)}
    />
  )
}

export default ExpertWorkspaceHeader
