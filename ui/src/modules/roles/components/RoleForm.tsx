import { useEffect, useState } from 'react'

type RoleFormProps = {
  existingNames: string[]
  editingRoleId: number | null
  initialName: string
  isSubmitting: boolean
  onSubmit: (name: string) => Promise<void>
  onCancelEdit: () => void
}

const RoleForm = ({
  existingNames,
  editingRoleId,
  initialName,
  isSubmitting,
  onSubmit,
  onCancelEdit,
}: RoleFormProps) => {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(initialName)
    setError(null)
  }, [initialName])

  const validate = () => {
    const trimmed = name.trim()

    if (!trimmed) {
      return 'Role name is required.'
    }

    const normalized = trimmed.toLowerCase()
    const duplicateExists = existingNames.some((roleName) => roleName.toLowerCase() === normalized)

    if (duplicateExists) {
      return 'Role name must be unique.'
    }

    return null
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextError = validate()

    if (nextError) {
      setError(nextError)
      return
    }

    setError(null)
    await onSubmit(name.trim())
  }

  const isEditMode = editingRoleId !== null

  return (
    <form className="card roles-form" onSubmit={handleSubmit}>
      <h3 className="roles-form__title">{isEditMode ? 'Edit role' : 'Create role'}</h3>

      <label className="auth-card__field" htmlFor="roleName">
        Role name
        <input
          id="roleName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter role name"
          disabled={isSubmitting}
        />
      </label>

      {error ? <p className="auth-card__error">{error}</p> : null}

      <div className="roles-form__actions">
        <button className="button button--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditMode ? 'Update role' : 'Create role'}
        </button>

        {isEditMode ? (
          <button className="button" type="button" onClick={onCancelEdit} disabled={isSubmitting}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}

export default RoleForm
