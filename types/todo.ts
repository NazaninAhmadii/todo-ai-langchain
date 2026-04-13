import { z } from 'zod'

export const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  createdAt: z.number(),
  dueDate: z.string().optional(),
})
export type Todo = z.infer<typeof TodoSchema>

// Subset used by the check_deadlines tool input and DeadlineResult lists.
// Does not include createdAt — that's an internal field the agent doesn't need.
export const TodoItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  dueDate: z.string().optional(),
})
export type TodoItem = z.infer<typeof TodoItemSchema>

const DeadlineSummarySchema = z.object({
  overdue: z.number(),
  dueToday: z.number(),
  upcoming: z.number(),
  noDueDate: z.number(),
})

export const DeadlineResultSchema = z.object({
  analyzedAt: z.string(),
  summary: DeadlineSummarySchema,
  overdue: z.array(TodoItemSchema),
  dueToday: z.array(TodoItemSchema),
  upcoming: z.array(TodoItemSchema),
  noDueDate: z.array(TodoItemSchema),
})
export type DeadlineResult = z.infer<typeof DeadlineResultSchema>
