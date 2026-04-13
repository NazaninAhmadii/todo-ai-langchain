'use client'

import { useEffect, useRef, useState } from 'react'
import { Streamdown } from 'streamdown'
import { useAgentChat } from '@/lib/use-agent-chat'
import { DeadlineCard } from './deadline-card'

export function Chat() {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, sendMessage, isLoading } = useAgentChat()

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    sendMessage(trimmed)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide">
          Agent
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Ask me to manage your tasks
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-400 text-center mt-8 leading-relaxed">
            Try: &quot;Add buy groceries due tomorrow&quot;
            <br />
            or: &quot;Check my deadlines&quot;
            <br />
            or: &quot;Mark the first task done&quot;
          </p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ${
                message.role === 'user'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-br-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-sm'
              }`}
            >
              {/* Deadline card renders above the text if present */}
              {message.deadlineResult && (
                <DeadlineCard result={message.deadlineResult} />
              )}

              {/* Streaming markdown for text content */}
              {message.content && (
                <Streamdown
                  className="[&_p]:mb-2 [&_p:last-child]:mb-0 [&_code]:bg-black/10 [&_code]:px-1 [&_code]:rounded [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                >
                  {message.content}
                </Streamdown>
              )}

              {/* Loading pulse while the assistant message is still empty */}
              {message.role === 'assistant' &&
                !message.content &&
                !message.deadlineResult &&
                isLoading && (
                  <span className="inline-block w-4 h-1.5 bg-current rounded opacity-40 animate-pulse" />
                )}
            </div>
          </div>
        ))}

        {/* Bouncing dots while waiting for first token */}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the agent..."
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          {isLoading ? '···' : 'Send'}
        </button>
      </form>
    </div>
  )
}
