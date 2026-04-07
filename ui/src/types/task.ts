export type TaskStatus = 'Pending' | 'In Progress' | 'Completed'

export interface Task {
  id: number
  title: string
  status: TaskStatus
  dueDate: string
}
