type ConfirmDialogProps = {
  isOpen: boolean
  title: string
  message: string
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onCancel}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(event) => event.stopPropagation()}>
        <h3 id="confirm-title" className="modal-title">
          {title}
        </h3>
        <p className="card-text">{message}</p>

        <div className="modal-actions">
          <button className="button" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button className="button button--danger" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
