import { useAuth } from '../../context/AuthContext'

const Header = () => {
  const { user } = useAuth()

  return (
    <header className="header">
      <h1 className="header__title">CRM Frontend</h1>
      <p className="header__meta">Role: {user.role}</p>
    </header>
  )
}

export default Header
