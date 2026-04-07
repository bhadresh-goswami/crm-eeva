import type { UserItem } from '../api/usersApi'

type UsersTableProps = {
  users: UserItem[]
  isLoading: boolean
  activeActionId: number | null
  onEdit: (user: UserItem) => void
  onDelete: (user: UserItem) => void
  onToggle: (user: UserItem) => void
  onUpdatePassword: (user: UserItem) => void
}

const isUserActive = (status: string) => status.toLowerCase() === 'active' || status === '1'

const UsersTable = ({
  users,
  isLoading,
  activeActionId,
  onEdit,
  onDelete,
  onToggle,
  onUpdatePassword,
}: UsersTableProps) => {
  if (isLoading) {
    return (
      <div className="card">
        <p className="card-text">Loading users...</p>
      </div>
    )
  }

  return (
    <div className="card users-table__wrapper">
      <table className="roles-table users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Team Lead</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={6} className="card-text">
                No users found.
              </td>
            </tr>
          ) : (
            users.map((user) => {
              const isActive = isUserActive(String(user.status))

              return (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role || '-'}</td>
                  <td>{user.team_lead || '-'}</td>
                  <td>
                    <span className={isActive ? 'status-pill status-pill--active' : 'status-pill'}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="roles-table__actions">
                      <button className="button" onClick={() => onEdit(user)} disabled={activeActionId === user.id}>
                        Edit
                      </button>
                      <button
                        className="button"
                        onClick={() => onToggle(user)}
                        disabled={activeActionId === user.id}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="button button--danger"
                        onClick={() => onDelete(user)}
                        disabled={activeActionId === user.id}
                      >
                        Delete
                      </button>
                      <button
                        className="button"
                        onClick={() => onUpdatePassword(user)}
                        disabled={activeActionId === user.id}
                      >
                        Update Password
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

export default UsersTable
