'use client'

import { useTodoStore } from '@/lib/store'
import { AddTodoForm } from './add-todo-form'
import { TodoItem } from './todo-item'

export function TodoList() {
  const todos = useTodoStore((s) => s.todos)
  const pending = todos.filter((t) => !t.completed)
  const completed = todos.filter((t) => t.completed)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide">
          Tasks
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          {pending.length} remaining
        </p>
      </div>

      <AddTodoForm />

      <div className="flex-1 overflow-y-auto">
        {todos.length === 0 && (
          <p className="text-sm text-neutral-400 text-center mt-8 px-4">
            No tasks yet. Add one above or ask the agent.
          </p>
        )}

        {pending.length > 0 && (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {pending.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </ul>
        )}

        {completed.length > 0 && (
          <>
            <div className="px-4 py-2 text-xs text-neutral-400 uppercase tracking-wide font-medium mt-2">
              Completed
            </div>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {completed.map((todo) => (
                <TodoItem key={todo.id} todo={todo} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
