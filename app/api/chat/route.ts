import { ChatOpenAI } from '@langchain/openai'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { tool } from '@langchain/core/tools'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { z } from 'zod'
import type { Todo } from '@/types/todo'
import { TodoItemSchema } from '@/types/todo'

// Force Node.js runtime — LangChain has Node.js dependencies.
export const runtime = 'nodejs'

// ── SSE helpers ─────────────────────────────────────────────────────────────

// SSE events the client understands:
//   { type: 'text_delta', content: string }         — a token from the LLM
//   { type: 'tool_result', tool: string, data: any } — a todo mutation result
//   { type: 'deadline_result', data: DeadlineResult } — generative UI payload
//   { type: 'error', message: string }
//   { type: 'done' }

type Emitter = (data: object) => Promise<void>

// Content from Claude can be a string or an array of content blocks.
// This normalises both formats to a plain string.
function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === 'object' && c !== null && 'text' in c ? String(c.text) : ''))
      .join('')
  }
  return ''
}

// ── Tool factory ─────────────────────────────────────────────────────────────
// All tools close over `todos` (server-side mutable list) and `emit` (SSE writer).
// When a tool runs it: (1) mutates todos, (2) emits an SSE event, (3) returns
// a string the LLM uses to continue reasoning.

function buildTools(todos: Todo[], emit: Emitter) {
  const addTodoTool = tool(
    async ({ title, dueDate }: { title: string; dueDate?: string }) => {
      const todo: Todo = {
        id: crypto.randomUUID(),
        title,
        completed: false,
        createdAt: Date.now(),
        dueDate,
      }
      todos.push(todo)
      await emit({ type: 'tool_result', tool: 'add_todo', data: todo })
      return `Added "${title}" with id ${todo.id}.`
    },
    {
      name: 'add_todo',
      description: 'Add a new todo item to the list',
      schema: z.object({
        title: z.string().describe('The todo item text'),
        dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format, if mentioned'),
      }),
    },
  )

  const updateTodoTool = tool(
    async ({ id, title, dueDate }: { id: string; title: string; dueDate?: string }) => {
      const todo = todos.find((t) => t.id === id)
      if (!todo) return `No todo found with id ${id}.`
      todo.title = title
      todo.dueDate = dueDate
      await emit({ type: 'tool_result', tool: 'update_todo', data: { id, title, dueDate } })
      return `Updated todo ${id}.`
    },
    {
      name: 'update_todo',
      description: 'Update the title or due date of an existing todo',
      schema: z.object({
        id: z.string().describe('The todo id to update'),
        title: z.string().describe('The new title'),
        dueDate: z.string().optional().describe('New due date in YYYY-MM-DD format'),
      }),
    },
  )

  const toggleTodoTool = tool(
    async ({ id }: { id: string }) => {
      const todo = todos.find((t) => t.id === id)
      if (!todo) return `No todo found with id ${id}.`
      todo.completed = !todo.completed
      await emit({ type: 'tool_result', tool: 'toggle_todo', data: { id, completed: todo.completed } })
      return `Toggled todo ${id} to ${todo.completed ? 'completed' : 'incomplete'}.`
    },
    {
      name: 'toggle_todo',
      description: 'Toggle a todo between completed and not completed',
      schema: z.object({
        id: z.string().describe('The todo id to toggle'),
      }),
    },
  )

  const deleteTodoTool = tool(
    async ({ id }: { id: string }) => {
      const index = todos.findIndex((t) => t.id === id)
      if (index === -1) return `No todo found with id ${id}.`
      todos.splice(index, 1)
      await emit({ type: 'tool_result', tool: 'delete_todo', data: { id } })
      return `Deleted todo ${id}.`
    },
    {
      name: 'delete_todo',
      description: 'Permanently delete a todo item',
      schema: z.object({
        id: z.string().describe('The todo id to delete'),
      }),
    },
  )

  const listTodosTool = tool(
    async () => {
      return JSON.stringify(todos)
    },
    {
      name: 'list_todos',
      description: 'Read the current todos — call this first when you need to find an id before acting',
      schema: z.object({}),
    },
  )

  const checkDeadlinesTool = tool(
    async ({ todos: input }: { todos: { id: string; title: string; completed: boolean; dueDate?: string }[] }) => {
      // Runs with access to the real server clock — the LLM cannot fake this.
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]

      const overdue: typeof input = []
      const dueToday: typeof input = []
      const upcoming: typeof input = []
      const noDueDate: typeof input = []

      for (const t of input) {
        if (t.completed) continue
        if (!t.dueDate) noDueDate.push(t)
        else if (t.dueDate < todayStr) overdue.push(t)
        else if (t.dueDate === todayStr) dueToday.push(t)
        else upcoming.push(t)
      }

      const result = {
        analyzedAt: now.toISOString(),
        summary: {
          overdue: overdue.length,
          dueToday: dueToday.length,
          upcoming: upcoming.length,
          noDueDate: noDueDate.length,
        },
        overdue,
        dueToday,
        upcoming,
        noDueDate,
      }

      // Emit the structured result so the client can render <DeadlineCard>.
      await emit({ type: 'deadline_result', data: result })
      return JSON.stringify(result.summary)
    },
    {
      name: 'check_deadlines',
      description:
        'Analyze todos by urgency: overdue, due today, upcoming, or no due date. Returns a summary.',
      schema: z.object({
        todos: z.array(TodoItemSchema).describe('The todos to analyze — pass the full current list'),
      }),
    },
  )

  return [addTodoTool, updateTodoTool, toggleTodoTool, deleteTodoTool, listTodosTool, checkDeadlinesTool]
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { messages: clientMessages, todos: clientTodos = [] } = await req.json()

  // Server-side todo state. Tools mutate this array in place and emit SSE events
  // so the client can sync its Zustand store in real time.
  const todos: Todo[] = clientTodos.map((t: Todo) => ({ ...t }))

  // Build the SSE stream. We write to it from tools (closure) and from the
  // LLM token stream. The readable side is returned as the HTTP response.
  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()

  const emit: Emitter = async (data) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  const today = new Date().toISOString().split('T')[0]

  const todosText =
    todos.length === 0
      ? 'No todos yet.'
      : todos
          .map(
            (t, i) =>
              `${i + 1}. [${t.completed ? 'x' : ' '}] ${t.title}` +
              (t.dueDate ? ` (due: ${t.dueDate})` : '') +
              ` [id: ${t.id}]`,
          )
          .join('\n')

  // Static content first so Anthropic can cache that prefix across requests.
  // Dynamic content (date, todos) goes at the end where it can change freely.
  const systemPrompt = `You are a concise, helpful todo assistant.

Rules:
- Use tools to act on todos. Never describe an action without doing it.
- After acting, confirm briefly (one sentence).
- When the user asks about deadlines or urgency, use check_deadlines.
- Use list_todos before acting if you need to find an id.

Today's date: ${today}

Current todo list:
${todosText}`

  const model = new ChatOpenAI({
    model: 'claude-sonnet-4-5',
    streaming: true,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
    },
  })

  // createReactAgent builds the ReAct graph:
  //   agent node → (if tool calls) → tools node → agent node → ...
  // It loops until the LLM produces a message with no tool calls.
  const agent = createReactAgent({
    llm: model,
    tools: buildTools(todos, emit),
    // messageModifier prepends a system message before the conversation.
    messageModifier: systemPrompt,
  })

  // Convert client messages [{ role, content }] to LangChain message objects.
  const inputMessages = (clientMessages as { role: string; content: string }[]).map((m) =>
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
  )

  // Run the agent asynchronously so we can return the readable stream immediately.
  // streamEvents fires fine-grained events for every step of the graph.
  ;(async () => {
    try {
      const eventStream = agent.streamEvents({ messages: inputMessages }, { version: 'v2' })

      for await (const event of eventStream) {
        // on_chat_model_stream fires for every token the LLM emits.
        // We only care about tokens from the 'agent' node (not tool result formatting).
        if (
          event.event === 'on_chat_model_stream' &&
          event.metadata?.langgraph_node === 'agent'
        ) {
          const text = extractText(event.data.chunk?.content)
          if (text) await emit({ type: 'text_delta', content: text })
        }
      }
    } catch (err) {
      await emit({ type: 'error', message: String(err) })
    } finally {
      await emit({ type: 'done' })
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
