import { type CSSProperties, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { FiChevronDown, FiChevronRight, FiX } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { roleDashboardPath } from '../../routes/roleDashboard'
import { buildHorizontalMenu, type HorizontalMenuItem } from './navigationConfig'

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
}

const itemIsActive = (item: HorizontalMenuItem, pathname: string): boolean => {
  if (item.to && pathname === item.to) return true
  return item.children?.some((child) => itemIsActive(child, pathname)) ?? false
}

const MenuLink = ({ item, className, onNavigate }: { item: HorizontalMenuItem; className: string; onNavigate?: () => void }) => {
  if (!item.to) {
    return (
      <button type="button" className={className}>
        <span className="horizontal-nav__item-icon">{item.icon}</span>
        <span className="horizontal-nav__item-label">{item.label}</span>
      </button>
    )
  }

  return (
    <NavLink to={item.to} className={className} onClick={onNavigate}>
      <span className="horizontal-nav__item-icon">{item.icon}</span>
      <span className="horizontal-nav__item-label">{item.label}</span>
    </NavLink>
  )
}

const DesktopDropdownItem = ({ item }: { item: HorizontalMenuItem }) => {
  const hasChildren = Boolean(item.children?.length)
  const className = `horizontal-nav__dropdown-item ${hasChildren ? 'horizontal-nav__dropdown-item--has-submenu' : ''}`

  return (
    <div className="horizontal-nav__dropdown-row">
      <MenuLink item={item} className={className} />
      {hasChildren ? (
        <>
          <FiChevronRight className="horizontal-nav__submenu-chevron" aria-hidden="true" />
          <div className="horizontal-nav__submenu" role="menu">
            {item.children?.map((child) => (
              <DesktopDropdownItem key={child.key} item={child} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

const DesktopMenuItem = ({ item, pathname }: { item: HorizontalMenuItem; pathname: string }) => {
  const hasChildren = Boolean(item.children?.length)
  const active = itemIsActive(item, pathname)

  return (
    <div className={`horizontal-nav__item ${active ? 'horizontal-nav__item--active' : ''}`}>
      {item.to && !hasChildren ? (
        <NavLink to={item.to} className="horizontal-nav__trigger">
          <span className="horizontal-nav__trigger-icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ) : (
        <button type="button" className="horizontal-nav__trigger" aria-haspopup="menu">
          <span className="horizontal-nav__trigger-icon">{item.icon}</span>
          <span>{item.label}</span>
          <FiChevronDown className="horizontal-nav__chevron" aria-hidden="true" />
        </button>
      )}

      {hasChildren ? (
        <div className="horizontal-nav__dropdown" role="menu">
          {item.children?.map((child) => (
            <DesktopDropdownItem key={child.key} item={child} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

const MobileMenuItem = ({ item, pathname, onNavigate, depth = 0 }: { item: HorizontalMenuItem; pathname: string; onNavigate: () => void; depth?: number }) => {
  const [open, setOpen] = useState(itemIsActive(item, pathname))
  const hasChildren = Boolean(item.children?.length)
  const active = itemIsActive(item, pathname)

  return (
    <div className="mobile-horizontal-nav__row" style={{ '--nav-depth': depth } as CSSProperties}>
      <div className={`mobile-horizontal-nav__item ${active ? 'mobile-horizontal-nav__item--active' : ''}`}>
        {item.to ? (
          <NavLink to={item.to} className="mobile-horizontal-nav__link" onClick={onNavigate}>
            <span className="horizontal-nav__item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ) : (
          <button type="button" className="mobile-horizontal-nav__link" onClick={() => setOpen((current) => !current)}>
            <span className="horizontal-nav__item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )}
        {hasChildren ? (
          <button type="button" className="mobile-horizontal-nav__toggle" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label={`Toggle ${item.label}`}>
            <FiChevronDown />
          </button>
        ) : null}
      </div>
      {hasChildren && open ? (
        <div className="mobile-horizontal-nav__children">
          {item.children?.map((child) => (
            <MobileMenuItem key={child.key} item={child} pathname={pathname} onNavigate={onNavigate} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user } = useAuth()
  const location = useLocation()

  const menuItems = useMemo(() => {
    if (!user) return []
    return buildHorizontalMenu(roleDashboardPath[user.role])
  }, [user])

  if (!user) return null

  return (
    <>
      <nav className="horizontal-nav" aria-label="Primary horizontal navigation">
        <div className="horizontal-nav__scroller">
          {menuItems.map((item) => (
            <DesktopMenuItem key={item.key} item={item} pathname={location.pathname} />
          ))}
        </div>
      </nav>

      <aside className={`mobile-horizontal-nav ${isOpen ? 'mobile-horizontal-nav--open' : 'mobile-horizontal-nav--closed'}`} aria-label="Mobile navigation">
        <div className="mobile-horizontal-nav__header">
          <strong>CMMS Menu</strong>
          <button type="button" className="mobile-horizontal-nav__close" onClick={onClose} aria-label="Close navigation"><FiX /></button>
        </div>
        <div className="mobile-horizontal-nav__body">
          {menuItems.map((item) => (
            <MobileMenuItem key={item.key} item={item} pathname={location.pathname} onNavigate={onClose} />
          ))}
        </div>
      </aside>
      {isOpen ? <button type="button" className="sidebar-backdrop" onClick={onClose} aria-label="Close navigation" /> : null}
    </>
  )
}

export default Sidebar
