import { TodoList } from '@/components/todo-list'
import { Chat } from '@/components/chat'

// Server Component — composes client components.
export default function Home() {
  return (
    <div className="flex flex-col flex-1 h-dvh">
      {/* Top bar */}
      <header className="flex items-center gap-2 px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shrink-0">
        <div className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-neutral-100" />
        <h1 className="text-sm font-semibold tracking-tight">Todo Agent</h1>
        <span className="text-xs text-neutral-400 ml-1">powered by LangChain</span>
      </header>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Todo list */}
        <div className="w-[420px] shrink-0 border-r border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col bg-white dark:bg-neutral-950">
          <TodoList />
        </div>

        {/* Right — Chat */}
        <div className="flex-1 overflow-hidden flex flex-col bg-neutral-50 dark:bg-neutral-900">
          <Chat />
        </div>
      </div>
    </div>
  )
}
