import { type ReactNode } from 'react'

type AnimatedModalProps = {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
  cardClassName?: string
  size?: 'md' | 'lg' | 'xl'
}

const sizeClassMap = {
  md: 'modal-card--md',
  lg: 'modal-card--lg',
  xl: 'modal-card--xl',
} as const

const AnimatedModal = ({ isOpen, title, onClose, children, cardClassName, size = 'lg' }: AnimatedModalProps) => {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className={cardClassName ? `modal-card ${sizeClassMap[size]} ${cardClassName}` : `modal-card ${sizeClassMap[size]}`}
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
