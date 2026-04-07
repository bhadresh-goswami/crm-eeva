import { NavLink } from 'react-router-dom'

const navClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'

const Sidebar = () => {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <h1 className="sidebar__title">CRM</h1>
      <nav>
        <ul className="sidebar__list">
          <li>
            <NavLink end to="/" className={navClassName}>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/tasks" className={navClassName}>
              Tasks
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
