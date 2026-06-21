import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { departments, designations, mockUsers, roleOptions, type UserRecord, userService } from '../api/userService'

const MultiRoleSelect = ({ value, onChange }: { value: string[]; onChange: (roles: string[]) => void }) => (
  <div className="role-check-grid">{roleOptions.map((role) => (
    <label key={role} className="form-check"><input className="form-check-input" type="checkbox" checked={value.includes(role)} onChange={(event) => onChange(event.target.checked ? [...value, role] : value.filter((item) => item !== role))} /> <span className="form-check-label">{role}</span></label>
  ))}</div>
)

const blankUser: UserRecord = {
  id: 0, employee_code: '', first_name: '', last_name: '', email: '', mobile: '', department_id: 1, department_name: 'Marketing', designation_id: 1, designation_name: 'Admin', reporting_to: null, reporting_to_name: '', profile_image: '', status: 'Active', roles: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
}

const UserFormPage = ({ mode }: { mode: 'add' | 'edit' }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<UserRecord>(blankUser)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (mode === 'edit' && id) {
      void userService.getUserById(Number(id)).then((user) => user && setForm(user))
    }
  }, [id, mode])

  const reportingOptions = useMemo(() => mockUsers.filter((user) => user.id !== form.id).map((user) => ({ value: String(user.id), label: `${user.employee_code} - ${user.first_name} ${user.last_name}` })), [form.id])

  const setField = (field: keyof UserRecord, value: string | number | null | string[]) => setForm((current) => ({ ...current, [field]: value }))

  const syncDepartment = (departmentId: number) => {
    const department = departments.find((item) => item.id === departmentId) ?? departments[0]
    setForm((current) => ({ ...current, department_id: department.id, department_name: department.department_name }))
  }

  const syncDesignation = (designationId: number) => {
    const designation = designations.find((item) => item.id === designationId) ?? designations[0]
    setForm((current) => ({ ...current, designation_id: designation.id, designation_name: designation.designation_name }))
  }

  const submit = async (event: FormEvent, addNew = false) => {
    event.preventDefault()
    setError('')
    if (!form.employee_code || !form.first_name || !form.last_name || !form.email || !form.mobile) {
      setError('Please complete all required employee information fields.')
      return
    }
    if (mode === 'add' && (!password || password !== confirmPassword)) {
      setError('Password and confirm password are required and must match.')
      return
    }
    await userService.saveUser({ ...form, updated_at: new Date().toISOString() })
    if (addNew) {
      setForm(blankUser); setPassword(''); setConfirmPassword('')
      return
    }
    navigate('/users')
  }

  return (
    <section className="user-management">
      <div className="users-page__header">
        <div><h2 className="page-title">{mode === 'add' ? 'Add User' : 'Edit User'}</h2><p className="page-description">UI-only user profile configured for future API wiring.</p></div>
        <Link className="button" to="/users">Cancel</Link>
      </div>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <form onSubmit={(event) => void submit(event)} className="user-form-grid">
        <div className="card user-form-section"><h3>Employee Information</h3><div className="row g-3">
          <label className="col-md-4 form-label">Employee Code<input className="form-control" value={form.employee_code} onChange={(e) => setField('employee_code', e.target.value)} /></label>
          <label className="col-md-4 form-label">First Name<input className="form-control" value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} /></label>
          <label className="col-md-4 form-label">Last Name<input className="form-control" value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} /></label>
          <label className="col-md-4 form-label">Email<input type="email" className="form-control" value={form.email} onChange={(e) => setField('email', e.target.value)} /></label>
          <label className="col-md-4 form-label">Mobile<input className="form-control" value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} /></label>
          <label className="col-md-4 form-label">Profile Image Upload<input type="file" className="form-control" accept="image/*" /></label>
        </div></div>
        <div className="card user-form-section"><h3>Organization Information</h3><div className="row g-3">
          <label className="col-md-4 form-label">Department<select className="form-select" value={form.department_id} onChange={(e) => syncDepartment(Number(e.target.value))}>{departments.map((item) => <option key={item.id} value={item.id}>{item.department_name}</option>)}</select></label>
          <label className="col-md-4 form-label">Designation<select className="form-select" value={form.designation_id} onChange={(e) => syncDesignation(Number(e.target.value))}>{designations.map((item) => <option key={item.id} value={item.id}>{item.designation_name}</option>)}</select></label>
          <label className="col-md-4 form-label">Reporting Person<input className="form-control mb-2" list="reporting-person-options" value={form.reporting_to_name} onChange={(e) => { const match = reportingOptions.find((option) => option.label === e.target.value); setField('reporting_to_name', e.target.value); setField('reporting_to', match ? Number(match.value) : null) }} placeholder="Search employee" /><datalist id="reporting-person-options">{reportingOptions.map((option) => <option key={option.value} value={option.label} />)}</datalist></label>
        </div></div>
        <div className="card user-form-section"><h3>Roles</h3><MultiRoleSelect value={form.roles} onChange={(roles) => setField('roles', roles)} /><div className="role-badges mt-3">{form.roles.map((role) => <span className="badge text-bg-primary" key={role}>{role}</span>)}</div></div>
        <div className="card user-form-section"><h3>Account Settings</h3><div className="row g-3">
          <label className="col-md-4 form-label">Password<input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <label className="col-md-4 form-label">Confirm Password<input type="password" className="form-control" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
          <label className="col-md-4 form-label">Status<select className="form-select" value={form.status} onChange={(e) => setField('status', e.target.value)}><option>Active</option><option>Inactive</option></select></label>
        </div></div>
        <div className="user-form-actions"><button className="button button--primary" type="submit">Save User</button>{mode === 'add' ? <button className="button" type="button" onClick={() => { const fakeEvent = { preventDefault: () => undefined } as FormEvent; void submit(fakeEvent, true) }}>Save & Add New</button> : null}<Link className="button" to="/users">Cancel</Link></div>
      </form>
    </section>
  )
}
export default UserFormPage
