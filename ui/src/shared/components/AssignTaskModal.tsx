import AnimatedModal from './AnimatedModal'

type AssignModalExpert = {
  id: number | string
  name: string
}

type ExpertAvailability = 'available' | 'not_available'

type AssignTaskModalProps = {
  isOpen: boolean
  title: string
  experts: AssignModalExpert[]
  loading?: boolean
  submitting?: boolean
  error?: string | null
  selectedExpertId: number | string | null
  onSelect: (expertId: number | string) => void
  getAvailability: (expertId: number | string) => ExpertAvailability
  onClose: () => void
  onConfirm: () => void
  confirmLabel: string
}

const AssignTaskModal = ({
  isOpen,
  title,
  experts,
  loading = false,
  submitting = false,
  error,
  selectedExpertId,
  onSelect,
  getAvailability,
  onClose,
  onConfirm,
  confirmLabel,
}: AssignTaskModalProps) => (
  <AnimatedModal isOpen={isOpen} onClose={onClose} title={title}>
    <h3 className="modal-title">{title}</h3>
    {loading ? (
      <p className="card-text">Loading experts...</p>
    ) : (
      <div className="roles-table__wrapper" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
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
              const availability = getAvailability(expert.id)
              const isAvailable = availability === 'available'
              return (
                <tr key={expert.id}>
                  <td>{expert.name}</td>
                  <td>
                    <span className={`status-pill ${isAvailable ? 'status-pill--active' : 'status-pill--inactive'}`}>
                      {isAvailable ? 'available' : 'not available'}
                    </span>
                  </td>
                  <td>
                    {isAvailable ? (
                      <button type="button" className="button" onClick={() => onSelect(expert.id)}>
                        {selectedExpertId === expert.id ? 'Selected' : 'Select'}
                      </button>
                    ) : (
                      <span className="card-text">Not Available</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )}
    {error ? <p className="auth-card__error">{error}</p> : null}
    <div className="modal-actions">
      <button type="button" className="button" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="button button--primary" onClick={onConfirm} disabled={submitting || !selectedExpertId}>
        {submitting ? 'Submitting...' : confirmLabel}
      </button>
    </div>
  </AnimatedModal>
)

export default AssignTaskModal
