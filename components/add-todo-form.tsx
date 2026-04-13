'use client'

import { useState } from 'react'
import { useTodoStore } from '@/lib/store'

export function AddTodoForm() {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const addTodo = useTodoStore((s) => s.addTodo)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    addTodo(trimmed, dueDate || undefined)
    setTitle('')
    setDueDate('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4 border-b border-neutral-200 dark:border-neutral-800">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New task..."
        className="px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-400"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-400 text-neutral-500"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="px-4 py-1.5 text-sm font-medium rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </form>
  )
}
