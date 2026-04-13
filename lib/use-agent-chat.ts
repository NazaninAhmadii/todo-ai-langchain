'use client'

import { useState, useCallback } from 'react'
import { useTodoStore } from './store'
import type { Todo } from '@/types/todo'

// ── Types ────────────────────────────────────────────────────────────────────

// The shape of a deadline analysis returned by the check_deadlines tool.
export type DeadlineResult = {
  analyzedAt: string
  summary: { overdue: number; dueToday: number; upcoming: number; noDueDate: number }
  overdue: { id: string; title: string; dueDate?: string }[]
  dueToday: { id: string; title: string; dueDate?: string }[]
  upcoming: { id: string; title: string; dueDate?: string }[]
  noDueDate: { id: string; title: string; dueDate?: string }[]
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  // Accumulated text content from text_delta events.
  content: string
  // Set when the agent calls check_deadlines — renders <DeadlineCard>.
  deadlineResult?: DeadlineResult
}

// ── SSE event shapes (mirroring what route.ts emits) ─────────────────────────

type TextDelta = { type: 'text_delta'; content: string }
type ToolResult =
  | { type: 'tool_result'; tool: 'add_todo'; data: Todo }
  | { type: 'tool_result'; tool: 'update_todo'; data: { id: string; title: string; dueDate?: string } }
  | { type: 'tool_result'; tool: 'toggle_todo'; data: { id: string; completed: boolean } }
  | { type: 'tool_result'; tool: 'delete_todo'; data: { id: string } }
  | { type: 'tool_result'; tool: 'list_todos' }
type DeadlineEvent = { type: 'deadline_result'; data: DeadlineResult }
type DoneEvent = { type: 'done' }
type ErrorEvent = { type: 'error'; message: string }

type SSEEvent = TextDelta | ToolResult | DeadlineEvent | DoneEvent | ErrorEvent

// ── Zustand mutation helpers ─────────────────────────────────────────────────
// Apply each server-side tool result to client Zustand state.
// We use useTodoStore.setState instead of the store actions because the server
// already assigned IDs — we must use the server's data verbatim.

function applyToolResult(event: ToolResult) {
  switch (event.tool) {
    case 'add_todo':
      useTodoStore.setState((s) => ({ todos: [...s.todos, event.data] }))
      break
    case 'update_todo': {
      const { id, title, dueDate } = event.data
      useTodoStore.setState((s) => ({
        todos: s.todos.map((t) => (t.id === id ? { ...t, title, dueDate } : t)),
      }))
      break
    }
    case 'toggle_todo': {
      const { id, completed } = event.data
      useTodoStore.setState((s) => ({
        todos: s.todos.map((t) => (t.id === id ? { ...t, completed } : t)),
      }))
      break
    }
    case 'delete_todo':
      useTodoStore.setState((s) => ({
        todos: s.todos.filter((t) => t.id !== event.data.id),
      }))
      break
  }
}

// ── SSE parser ───────────────────────────────────────────────────────────────
// Reads a ReadableStream<Uint8Array> and yields parsed SSE event objects.

async function* parseSSE(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SSEEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE messages are separated by double newlines.
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        const line = part.trim()
        if (line.startsWith('data: ')) {
          try {
            yield JSON.parse(line.slice(6)) as SSEEvent
          } catch {
            // Ignore malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return

      // Append user message immediately.
      const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text }
      // Create an empty assistant message slot that we'll fill as tokens arrive.
      const assistantId = crypto.randomUUID()
      const assistantMessage: ChatMessage = { id: assistantId, role: 'assistant', content: '' }

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setIsLoading(true)

      try {
        // Build the conversation history for the server.
        // We send only user/assistant messages (tool messages stay server-side).
        const history = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            todos: useTodoStore.getState().todos,
          }),
        })

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`)
        }

        // Consume the SSE stream.
        for await (const event of parseSSE(res.body)) {
          switch (event.type) {
            case 'text_delta':
              // Append the token to the assistant message in place.
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + event.content } : m,
                ),
              )
              break

            case 'tool_result':
              // Sync the server's mutation to the client Zustand store.
              applyToolResult(event)
              break

            case 'deadline_result':
              // Attach the structured result to the assistant message so the
              // chat component can render <DeadlineCard>.
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, deadlineResult: event.data } : m,
                ),
              )
              break

            case 'error':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `Error: ${event.message}` }
                    : m,
                ),
              )
              break

            case 'done':
              break
          }
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${String(err)}` }
              : m,
          ),
        )
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading],
  )

  return { messages, sendMessage, isLoading }
}
