"use client"

import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
  className?: string
}

export function ChatMessage({ role, content, timestamp, className }: ChatMessageProps) {
  const isUser = role === 'user'
  
  return (
    <div className={cn(
      "flex gap-3 group",
      isUser ? "flex-row-reverse" : "flex-row",
      className
    )}>
      {/* Avatar */}
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
        isUser 
          ? "bg-gradient-to-r from-pink-500 to-purple-500"
          : "bg-gray-100 dark:bg-gray-800 border border-gray-200/30 dark:border-gray-700/30"
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        )}
      </div>

      {/* Message Bubble */}
      <div className={cn(
        "max-w-[75%] flex flex-col",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "px-4 py-3 rounded-2xl",
          isUser 
            ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
            : "bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-gray-200/30 dark:border-gray-700/30 text-gray-900 dark:text-gray-100"
        )}>
          {/* Content with markdown support */}
          <div className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap",
            !isUser && "prose prose-sm dark:prose-invert max-w-none"
          )}>
            {/* For AI messages, parse markdown formatting */}
            {!isUser ? (
              <FormattedMessage content={content} />
            ) : (
              content
            )}
          </div>
        </div>
        
        {/* Timestamp */}
        {timestamp && (
          <span className={cn(
            "text-xs text-gray-500 dark:text-gray-400 mt-1 px-2",
            isUser ? "text-right" : "text-left"
          )}>
            {new Date(timestamp).toLocaleTimeString('it-IT', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        )}
      </div>
    </div>
  )
}

// Simple markdown formatter for AI responses
function FormattedMessage({ content }: { content: string }) {
  // Format bold **text**
  let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // Format bullet lists • item
  formatted = formatted.replace(/^•\s(.+)$/gm, '<li>$1</li>')
  
  // Wrap list items in ul
  if (formatted.includes('<li>')) {
    formatted = formatted.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul className="list-disc pl-4 my-2">$1</ul>')
  }
  
  // Format numbered lists 1. item
  formatted = formatted.replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
  
  return <div dangerouslySetInnerHTML={{ __html: formatted }} />
}

// Typing Indicator Component
export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      {/* Bot Avatar */}
      <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-200/30 dark:border-gray-700/30">
        <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-pulse" />
      </div>

      {/* Typing Animation */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-gray-200/30 dark:border-gray-700/30 px-4 py-3 rounded-2xl">
        <div className="flex gap-1.5">
          <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}
