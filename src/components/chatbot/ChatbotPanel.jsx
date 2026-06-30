import React, { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { sendChatMessage } from '../../services/aiService'

const WELCOME = `Hi! I'm your Benchmark Hub assistant powered by Cloudflare AI. 

I can help you:
- **Compare models** across latency and accuracy
- **Find the best model** for a specific task
- **Explain metrics** and benchmark methodology
- **Answer questions** about any data in this hub

What would you like to know?`

const SUGGESTIONS = [
  'Which model has the best accuracy?',
  'Compare image classification models',
  'What is the fastest text model?',
  'Show models under 50ms latency',
]

export default function ChatbotPanel({ models, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: WELCOME, id: 0 },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function send(text) {
    const userMsg = text || input.trim()
    if (!userMsg || loading) return
    setInput('')

    const newMessages = [
      ...messages,
      { role: 'user', content: userMsg, id: Date.now() },
    ]
    setMessages(newMessages)
    setLoading(true)

    try {
      // Provide a summarized context so the AI can reference real data
      const context = models.slice(0, 30).map(m => ({
        name: m.name,
        type: m.type,
        category: m.category,
        creator: m.creator,
        description: m.description,
      }))

      const { reply } = await sendChatMessage(userMsg, context)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: reply, id: Date.now() + 1 },
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Sorry, I couldn't connect to the AI service. Make sure your Cloudflare Worker is deployed and \`VITE_CF_WORKER_URL\` is set.\n\n_Error: ${err.message}_`,
          id: Date.now() + 1,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <aside className="w-80 lg:w-96 shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-800">
        <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
          <Sparkles size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">AI Assistant</p>
          <p className="text-xs text-gray-500 truncate">Powered by Cloudflare AI</p>
        </div>
        <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close chat">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 bg-brand-600/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <Bot size={13} className="text-brand-400" />
            </div>
            <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-4">
                <span className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                <span className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                <span className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips (only on welcome state) */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about benchmarks…"
            rows={1}
            className="input resize-none text-sm py-2.5 leading-5"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="btn-primary px-3 py-2.5 shrink-0"
            aria-label="Send message"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5 text-center">
          Queries are answered with live benchmark data
        </p>
      </div>
    </aside>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  // Simple markdown-like rendering for **bold**, newlines
  function renderContent(text) {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g)
      return (
        <React.Fragment key={i}>
          {parts.map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="font-semibold text-white">
                {part}
              </strong>
            ) : (
              part
            )
          )}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      )
    })
  }

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="bg-brand-600 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]">
          <p className="text-sm text-white leading-relaxed">{message.content}</p>
        </div>
        <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center shrink-0 mt-0.5">
          <User size={13} className="text-gray-300" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 bg-brand-600/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
        <Bot size={13} className="text-brand-400" />
      </div>
      <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%]">
        <p className="text-sm text-gray-200 leading-relaxed">
          {renderContent(message.content)}
        </p>
      </div>
    </div>
  )
}
