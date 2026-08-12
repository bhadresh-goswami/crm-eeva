import { type ReactNode } from 'react'

type PageContainerProps = {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

const PageContainer = ({ title, description, actions, children, className = '' }: PageContainerProps) => {
  return (
    <section className={`page-container${className ? ` ${className}` : ''}`}>
      {title || description || actions ? (
        <div className="page-container__header">
          <div>
            {title ? <h2 className="page-title">{title}</h2> : null}
            {description ? <p className="page-description">{description}</p> : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export default PageContainer
