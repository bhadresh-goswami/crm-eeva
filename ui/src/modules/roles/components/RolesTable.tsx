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
                <div className="roles-table__actions users-actions">
                  <button
                    className="button users-icon-btn"
                    onClick={() => onEdit(role)}
                    disabled={actionRoleId === role.id}
                    title="Edit role"
                    aria-label="Edit role"
                  >
                    ✏️
                  </button>
                  <button
                    className="button button--danger users-icon-btn"
                    onClick={() => onDelete(role)}
                    disabled={actionRoleId === role.id}
                    title="Delete role"
                    aria-label="Delete role"
                  >
                    🗑️
                  </button>
                  <button
                    className="button users-icon-btn"
                    onClick={() => onToggle(role)}
                    disabled={actionRoleId === role.id}
                    title={role.isActive ? 'Deactivate role' : 'Activate role'}
                    aria-label={role.isActive ? 'Deactivate role' : 'Activate role'}
                  >
                    🔄
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
