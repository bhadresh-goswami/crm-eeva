export type UserStatus = 'Active' | 'Inactive'

export type UserRecord = {
  id: number
  employee_code: string
  first_name: string
  last_name: string
  email: string
  mobile: string
  department_id: number
  department_name: string
  designation_id: number
  designation_name: string
  reporting_to: number | null
  reporting_to_name: string
  profile_image: string
  status: UserStatus
  roles: string[]
  created_at: string
  updated_at: string
}

export type DepartmentOption = { id: number; department_name: string; status: UserStatus }
export type DesignationOption = { id: number; designation_name: string; status: UserStatus }

export const departments: DepartmentOption[] = ['Marketing', 'Recruitment', 'Sales', 'Operations', 'Training', 'Accounts', 'HR'].map((department_name, index) => ({ id: index + 1, department_name, status: 'Active' }))
export const designations: DesignationOption[] = ['Admin', 'Manager', 'Team Lead', 'Recruiter', 'Marketing Executive', 'HR Executive'].map((designation_name, index) => ({ id: index + 1, designation_name, status: 'Active' }))
export const roleOptions = ['Admin', 'Manager', 'Team Lead', 'Recruiter', 'Viewer']

const names = [
  ['Ananya', 'Sharma', 1, 1, ['Admin']], ['Rohan', 'Mehta', 2, 2, ['Manager']], ['Priya', 'Nair', 2, 4, ['Recruiter']], ['Vikram', 'Rao', 3, 5, ['Manager', 'Viewer']], ['Sneha', 'Patel', 4, 3, ['Team Lead']],
  ['Arjun', 'Singh', 5, 6, ['Viewer']], ['Meera', 'Iyer', 7, 6, ['HR Executive', 'Viewer']], ['Karan', 'Kapoor', 6, 2, ['Manager']], ['Neha', 'Gupta', 1, 5, ['Recruiter', 'Viewer']], ['Amit', 'Verma', 2, 3, ['Team Lead', 'Recruiter']],
  ['Sara', 'Khan', 3, 4, ['Recruiter']], ['Dev', 'Joshi', 4, 2, ['Manager']], ['Isha', 'Bose', 5, 3, ['Team Lead']], ['Nikhil', 'Menon', 6, 6, ['Viewer']], ['Pooja', 'Das', 7, 2, ['Manager']],
  ['Rahul', 'Chopra', 1, 4, ['Recruiter']], ['Tara', 'Malhotra', 2, 5, ['Recruiter']], ['Kabir', 'Saxena', 3, 3, ['Team Lead']], ['Aisha', 'Roy', 4, 6, ['Viewer']], ['Manav', 'Bhatia', 5, 2, ['Manager', 'Team Lead']],
  ['Ritika', 'Sethi', 6, 6, ['Viewer']], ['Aditya', 'Pillai', 7, 1, ['Admin', 'Manager']], ['Simran', 'Gill', 1, 5, ['Recruiter']], ['Yash', 'Thakur', 2, 4, ['Recruiter']], ['Lavanya', 'Mishra', 3, 3, ['Team Lead']],
]

export const mockUsers: UserRecord[] = names.map(([first, last, departmentId, designationId, roles], index) => {
  const id = index + 1
  const reporting = id <= 2 ? null : ((id % 5) + 1)
  return {
    id,
    employee_code: `EMP${String(id).padStart(4, '0')}`,
    first_name: String(first),
    last_name: String(last),
    email: `${String(first).toLowerCase()}.${String(last).toLowerCase()}@cmms.test`,
    mobile: `98765${String(43000 + id).slice(-5)}`,
    department_id: Number(departmentId),
    department_name: departments[Number(departmentId) - 1].department_name,
    designation_id: Number(designationId),
    designation_name: designations[Number(designationId) - 1].designation_name,
    reporting_to: reporting,
    reporting_to_name: reporting ? `${names[reporting - 1][0]} ${names[reporting - 1][1]}` : 'Executive Office',
    profile_image: `https://ui-avatars.com/api/?name=${first}+${last}&background=2563eb&color=fff`,
    status: id % 6 === 0 ? 'Inactive' : 'Active',
    roles: roles as string[],
    created_at: '2026-06-01T09:00:00Z',
    updated_at: '2026-06-12T14:30:00Z',
  }
})

let users = [...mockUsers]
const delay = async () => new Promise((resolve) => window.setTimeout(resolve, 120))

export const userService = {
  async getUsers() { await delay(); return [...users] },
  async getUserById(id: number) { await delay(); return users.find((user) => user.id === id) ?? null },
  async deleteUser(id: number) { await delay(); users = users.filter((user) => user.id !== id) },
  async toggleStatus(id: number) { await delay(); users = users.map((user) => user.id === id ? { ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' } : user) },
  async saveUser(data: UserRecord) { await delay(); users = users.some((user) => user.id === data.id) ? users.map((user) => user.id === data.id ? data : user) : [{ ...data, id: Math.max(...users.map((user) => user.id)) + 1 }, ...users] },
  async getDepartments() { await delay(); return departments },
  async getDesignations() { await delay(); return designations },
}
