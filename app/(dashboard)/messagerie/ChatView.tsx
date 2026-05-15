"use client"

import { useRef, useState, useTransition, useEffect } from "react"
import { Send } from "lucide-react"
import { sendMessage } from "./actions"
import { useRouter } from "next/navigation"

type Message = {
  id: string
  sender_role: string
  content: string
  created_at: string
}

export function ChatView({ messages }: { messages: Message[] }) {
  const [text, setText] = useState("")
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || isPending) return
    setText("")
    startTransition(async () => {
      await sendMessage(trimmed)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-d5-muted text-sm text-center">
              Envoie un message à ton coach.
              <br />
              <span className="text-xs">Il te répondra dès que possible.</span>
            </p>
          </div>
        )}
        {messages.map((m) => {
          const isClient = m.sender_role === "client"
          const time = new Date(m.created_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })
          return (
            <div
              key={m.id}
              className={`flex ${isClient ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                  isClient
                    ? "bg-d5-gold text-black rounded-br-sm"
                    : "bg-d5-surface-2 text-white rounded-bl-sm"
                }`}
              >
                {!isClient && (
                  <p className="text-[10px] font-bold text-d5-gold mb-1">Coach</p>
                )}
                <p className="text-sm leading-relaxed">{m.content}</p>
                <p className={`text-[10px] mt-1 text-right ${
                  isClient ? "text-black/50" : "text-d5-muted"
                }`}>{time}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 pb-1 border-t border-d5-border">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Envoyer un message..."
            rows={1}
            className="flex-1 bg-d5-surface-2 border border-d5-border rounded-2xl px-4 py-3 text-white text-sm placeholder:text-d5-muted focus:outline-none focus:border-d5-gold/50 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || isPending}
            className="w-11 h-11 rounded-2xl bg-d5-gold flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity active:scale-90"
          >
            <Send size={16} className="text-black" />
          </button>
        </div>
      </div>
    </div>
  )
}
