import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye, FaPen, FaPowerOff, FaTrash } from 'react-icons/fa'
import { departments, designations, type UserRecord, userService } from '../api/userService'

const PAGE_SIZE = 10

const UsersPage = () => {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('all')
  const [designation, setDesignation] = useState('all')
  const [status, setStatus] = useState('all')
  const [reportingTo, setReportingTo] = useState('all')
  const [page, setPage] = useState(1)
  const loadUsers = () => void userService.getUsers().then(setUsers)
  useEffect(loadUsers, [])

  const reportingOptions = useMemo(() => [...new Set(users.map((user) => user.reporting_to_name).filter(Boolean))], [users])
  const filtered = useMemo(() => users.filter((user) => {
    const haystack = `${user.employee_code} ${user.first_name} ${user.last_name} ${user.email} ${user.mobile}`.toLowerCase()
    return (!query || haystack.includes(query.toLowerCase())) && (department === 'all' || user.department_name === department) && (designation === 'all' || user.designation_name === designation) && (status === 'all' || user.status === status) && (reportingTo === 'all' || user.reporting_to_name === reportingTo)
  }), [department, designation, query, reportingTo, status, users])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const reset = () => { setQuery(''); setDepartment('all'); setDesignation('all'); setStatus('all'); setReportingTo('all'); setPage(1) }
  const remove = async (user: UserRecord) => {
    const isConfirmed = window.confirm(`Delete ${user.first_name} ${user.last_name}?`)
    if (isConfirmed) { await userService.deleteUser(user.id); loadUsers() }
  }
  const toggle = async (user: UserRecord) => { await userService.toggleStatus(user.id); loadUsers() }

  return <section className="user-management">
    <div className="users-page__header"><div><h2 className="page-title">Users</h2><p className="page-description">Master Management / Users</p></div><Link className="button button--primary" to="/users/add">Add User</Link></div>
    <div className="card users-controls user-filter-grid">
      <label className="form-label">Search<input className="form-control" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} placeholder="Employee, name, email, mobile" /></label>
      <label className="form-label">Department<select className="form-select" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1) }}><option value="all">All departments</option>{departments.map((item) => <option key={item.id}>{item.department_name}</option>)}</select></label>
      <label className="form-label">Designation<select className="form-select" value={designation} onChange={(e) => { setDesignation(e.target.value); setPage(1) }}><option value="all">All designations</option>{designations.map((item) => <option key={item.id}>{item.designation_name}</option>)}</select></label>
      <label className="form-label">Status<select className="form-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="all">All status</option><option>Active</option><option>Inactive</option></select></label>
      <label className="form-label">Reporting Person<select className="form-select" value={reportingTo} onChange={(e) => { setReportingTo(e.target.value); setPage(1) }}><option value="all">All reporting persons</option>{reportingOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button type="button" className="button align-self-end" onClick={reset}>Reset Filters</button>
    </div>
    <div className="card table-card users-table__wrapper"><table className="roles-table users-table crm-table"><thead><tr><th>Employee Code</th><th>Name</th><th>Email</th><th>Mobile</th><th>Department</th><th>Designation</th><th>Reporting To</th><th>Roles</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map((user) => <tr key={user.id}><td>{user.employee_code}</td><td><div className="user-cell"><img className="avatar-img" src={user.profile_image} alt="" /><strong>{user.first_name} {user.last_name}</strong></div></td><td>{user.email}</td><td>{user.mobile}</td><td>{user.department_name}</td><td>{user.designation_name}</td><td>{user.reporting_to_name}</td><td><div className="role-badges">{user.roles.map((role) => <span className="badge text-bg-primary" key={role}>{role}</span>)}</div></td><td><span className={`badge ${user.status === 'Active' ? 'text-bg-success' : 'text-bg-danger'}`}>{user.status}</span></td><td><div className="users-actions"><Link className="btn btn-sm btn-outline-primary" to={`/users/${user.id}`} title="View"><FaEye /></Link><Link className="btn btn-sm btn-outline-secondary" to={`/users/${user.id}/edit`} title="Edit"><FaPen /></Link><button className="btn btn-sm btn-outline-warning" onClick={() => void toggle(user)} title={user.status === 'Active' ? 'Deactivate' : 'Activate'}><FaPowerOff /></button><button className="btn btn-sm btn-outline-danger" onClick={() => void remove(user)} title="Delete"><FaTrash /></button></div></td></tr>)}</tbody></table></div>
    <div className="users-pagination"><button className="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><div className="users-pagination__pages">{Array.from({ length: totalPages }, (_, i) => i + 1).map((item) => <button key={item} className={item === page ? 'button button--primary' : 'button'} onClick={() => setPage(item)}>{item}</button>)}</div><button className="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div>
  </section>
}
export default UsersPage
