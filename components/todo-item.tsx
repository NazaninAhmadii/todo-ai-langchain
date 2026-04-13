'use client'

import { useState } from 'react'
import { useTodoStore } from '@/lib/store'
import type { Todo } from '@/types/todo'

export function TodoItem({ todo }: { todo: Todo }) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)
  const [editDueDate, setEditDueDate] = useState(todo.dueDate ?? '')
  const { toggleTodo, deleteTodo, updateTodo } = useTodoStore()

  const today = new Date().toISOString().split('T')[0]

  function dueDateBadgeClass() {
    if (!todo.dueDate || todo.completed) return ''
    if (todo.dueDate < today) return 'text-red-600 dark:text-red-400'
    if (todo.dueDate === today) return 'text-amber-600 dark:text-amber-400'
    return 'text-blue-600 dark:text-blue-400'
  }

  function saveEdit() {
    const trimmed = editTitle.trim()
    if (trimmed) updateTodo(todo.id, trimmed, editDueDate || undefined)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="px-4 py-2 flex flex-col gap-1.5">
        <input
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
          className="px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-400"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={editDueDate}
            onChange={(e) => setEditDueDate(e.target.value)}
            className="flex-1 px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none"
          />
          <button onClick={saveEdit} className="text-xs px-3 py-1 rounded bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900">Save</button>
          <button onClick={() => setEditing(false)} className="text-xs px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700">Cancel</button>
        </div>
      </li>
    )
  }

  return (
    <li className="group px-4 py-2.5 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
      <button
        onClick={() => toggleTodo(todo.id)}
        className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
          todo.completed
            ? 'bg-neutral-900 dark:bg-neutral-100 border-neutral-900 dark:border-neutral-100'
            : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-500'
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${todo.completed ? 'line-through text-neutral-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
          {todo.title}
        </p>
        {todo.dueDate && (
          <p className={`text-xs mt-0.5 ${dueDateBadgeClass()}`}>
            {todo.dueDate}
          </p>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="text-xs px-2 py-0.5 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          Edit
        </button>
        <button
          onClick={() => deleteTodo(todo.id)}
          className="text-xs px-2 py-0.5 rounded text-neutral-400 hover:text-red-600"
        >
          Del
        </button>
      </div>
    </li>
  )
}
