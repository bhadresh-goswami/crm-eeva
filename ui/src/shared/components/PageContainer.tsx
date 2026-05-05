import { type ReactNode } from 'react'

type PageContainerProps = {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

const PageContainer = ({ title, description, actions, children }: PageContainerProps) => {
  return (
    <section className="page-container">
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
