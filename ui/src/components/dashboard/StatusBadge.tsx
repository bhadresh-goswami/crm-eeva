type StatusBadgeProps = {
  status: string
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const normalized = status.toLowerCase()
  const tone = normalized.includes('cancel') ? 'cancelled' : normalized.includes('complete') || normalized.includes('paid') || normalized.includes('available') ? 'completed' : 'pending'

  return <span className={`crm-status-badge crm-status-badge--${tone}`}>{status}</span>
}

export default StatusBadge
