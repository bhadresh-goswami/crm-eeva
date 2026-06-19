import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { type UserRecord, userService } from '../api/userService'

const UserViewPage = () => {
  const { id } = useParams()
  const [user, setUser] = useState<UserRecord | null>(null)
  useEffect(() => { void userService.getUserById(Number(id)).then(setUser) }, [id])
  if (!user) return <div className="card">User profile not found.</div>
  return <section className="user-management">
    <div className="profile-header card">
      <img src={user.profile_image} alt={`${user.first_name} ${user.last_name}`} />
      <div><p className="text-muted">{user.employee_code}</p><h2>{user.first_name} {user.last_name}</h2><p>{user.department_name} • {user.designation_name}</p></div>
      <span className={`badge ${user.status === 'Active' ? 'text-bg-success' : 'text-bg-danger'}`}>{user.status}</span>
    </div>
    <div className="profile-grid">
      <div className="card"><h3>Profile Information</h3><p>Email: {user.email}</p><p>Mobile: {user.mobile}</p><p>Employee Code: {user.employee_code}</p></div>
      <div className="card"><h3>Organization Information</h3><p>Department: {user.department_name}</p><p>Designation: {user.designation_name}</p><p>Reporting To: {user.reporting_to_name}</p></div>
      <div className="card"><h3>Roles</h3><div className="role-badges">{user.roles.map((role) => <span className="badge text-bg-primary" key={role}>{role}</span>)}</div></div>
      <div className="card"><h3>Account Status</h3><span className={`badge ${user.status === 'Active' ? 'text-bg-success' : 'text-bg-danger'}`}>{user.status}</span></div>
    </div>
    <div className="user-form-actions"><Link className="button button--primary" to={`/users/${user.id}/edit`}>Edit</Link><Link className="button" to="/users">Back</Link></div>
  </section>
}
export default UserViewPage
