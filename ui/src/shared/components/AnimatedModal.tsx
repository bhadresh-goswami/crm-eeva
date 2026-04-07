import { type ReactNode } from 'react'

type AnimatedModalProps = {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

const AnimatedModal = ({ isOpen, title, onClose, children }: AnimatedModalProps) => {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export default AnimatedModal
