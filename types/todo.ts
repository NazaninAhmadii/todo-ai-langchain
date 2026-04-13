export type Todo = {
  id: string
  title: string
  completed: boolean
  createdAt: number
  dueDate?: string // "YYYY-MM-DD" format
}
