import { create } from 'zustand'
import type { Todo } from '@/types/todo'

type TodoStore = {
  todos: Todo[]
  addTodo: (title: string, dueDate?: string) => Todo
  updateTodo: (id: string, title: string, dueDate?: string) => void
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void
  setTodos: (todos: Todo[]) => void
}

export const useTodoStore = create<TodoStore>((set) => ({
  todos: [],
  addTodo: (title, dueDate) => {
    const todo: Todo = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: Date.now(),
      dueDate,
    }
    set((state) => ({ todos: [...state.todos, todo] }))
    return todo
  },
  updateTodo: (id, title, dueDate) =>
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, title, dueDate } : t)),
    })),
  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    })),
  deleteTodo: (id) =>
    set((state) => ({ todos: state.todos.filter((t) => t.id !== id) })),
  setTodos: (todos) => set({ todos }),
}))
