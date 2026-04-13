// Generative UI component — rendered when the AI calls check_deadlines.
// The AI decides WHEN to show this; this component decides HOW it looks.

import type { DeadlineResult } from '@/types/todo'

export function DeadlineCard({ result }: { result: DeadlineResult }) {
  const time = new Date(result.analyzedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="mt-1 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden text-xs w-full">
      {/* Header */}
      <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-900 flex justify-between items-center border-b border-neutral-200 dark:border-neutral-700">
        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
          Deadline Analysis
        </span>
        <span className="text-neutral-400">{time}</span>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 divide-x divide-neutral-200 dark:divide-neutral-700 border-b border-neutral-200 dark:border-neutral-700">
        <StatCell label="Overdue" count={result.summary.overdue} colorClass="text-red-600 dark:text-red-400" />
        <StatCell label="Today" count={result.summary.dueToday} colorClass="text-amber-600 dark:text-amber-400" />
        <StatCell label="Upcoming" count={result.summary.upcoming} colorClass="text-blue-600 dark:text-blue-400" />
        <StatCell label="No date" count={result.summary.noDueDate} colorClass="text-neutral-400" />
      </div>

      {result.overdue.length > 0 && (
        <Section label="⚠ Overdue" todos={result.overdue} labelClass="text-red-600 dark:text-red-400" />
      )}
      {result.dueToday.length > 0 && (
        <Section label="Due today" todos={result.dueToday} labelClass="text-amber-600 dark:text-amber-400" />
      )}
      {result.upcoming.length > 0 && (
        <Section label="Upcoming" todos={result.upcoming} labelClass="text-blue-600 dark:text-blue-400" />
      )}

      {result.summary.overdue === 0 && result.summary.dueToday === 0 && (
        <div className="px-3 py-2 text-neutral-500 bg-white dark:bg-neutral-800">
          All caught up — no overdue or due-today tasks.
        </div>
      )}
    </div>
  )
}

function StatCell({ label, count, colorClass }: { label: string; count: number; colorClass: string }) {
  return (
    <div className="px-2 py-2 text-center bg-white dark:bg-neutral-800">
      <div className={`text-base font-bold ${colorClass}`}>{count}</div>
      <div className="text-neutral-500">{label}</div>
    </div>
  )
}

function Section({
  label,
  todos,
  labelClass,
}: {
  label: string
  todos: { id: string; title: string; dueDate?: string }[]
  labelClass: string
}) {
  return (
    <div className="border-t border-neutral-200 dark:border-neutral-700 px-3 py-2 bg-white dark:bg-neutral-800">
      <div className={`font-semibold mb-1 ${labelClass}`}>{label}</div>
      <ul className="space-y-0.5">
        {todos.map((t) => (
          <li key={t.id} className="flex justify-between text-neutral-600 dark:text-neutral-400">
            <span>{t.title}</span>
            {t.dueDate && <span className="text-neutral-400 ml-2">{t.dueDate}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
