import type { Task } from '../types/task'

const TASKS: Task[] = [
  { id: 1, title: 'Qualify inbound leads', status: 'In Progress', dueDate: '2026-04-08' },
  { id: 2, title: 'Prepare follow-up email campaign', status: 'Pending', dueDate: '2026-04-10' },
  { id: 3, title: 'Review renewal opportunities', status: 'Completed', dueDate: '2026-04-04' },
]

export const getTasks = async (): Promise<Task[]> => {
  return Promise.resolve(TASKS)
}
