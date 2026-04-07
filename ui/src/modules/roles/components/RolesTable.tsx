import type { Role } from '../api/rolesApi'

type RolesTableProps = {
  roles: Role[]
  isLoading: boolean
  actionRoleId: number | null
  onEdit: (role: Role) => void
  onDelete: (role: Role) => Promise<void>
  onToggle: (role: Role) => Promise<void>
}

const RolesTable = ({ roles, isLoading, actionRoleId, onEdit, onDelete, onToggle }: RolesTableProps) => {
  if (isLoading) {
    return (
      <div className="card">
        <p className="card-text">Loading roles...</p>
      </div>
    )
  }

  if (roles.length === 0) {
    return (
      <div className="card">
        <p className="card-text">No roles found.</p>
      </div>
    )
  }

  return (
    <div className="card roles-table__wrapper">
      <table className="roles-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id}>
              <td>{role.id}</td>
              <td>{role.name}</td>
              <td>{role.isActive ? 'Active' : 'Inactive'}</td>
              <td>
                <div className="roles-table__actions">
                  <button className="button" onClick={() => onEdit(role)} disabled={actionRoleId === role.id}>
                    Edit
                  </button>
                  <button
                    className="button button--danger"
                    onClick={() => onDelete(role)}
                    disabled={actionRoleId === role.id}
                  >
                    Delete
                  </button>
                  <button
                    className="button"
                    onClick={() => onToggle(role)}
                    disabled={actionRoleId === role.id}
                  >
                    {role.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default RolesTable
