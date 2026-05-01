'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { chatApi } from '@/lib/chatApi'
import { authApi } from '@/lib/api'

interface ConversationPreview {
  id: string
  isGroup: boolean
  lastMessageAt: string
  participants: { id: string; username: string; displayName?: string; avatarUrl?: string; lastReadAt?: string }[]
  lastMessage?: { content?: string; senderId: string }
  unreadCount: number
}

function ConversationSkeleton() {
  return (
    <div className="p-4 flex items-center gap-3 animate-pulse">
      {/* Avatar skeleton */}
      <div className="w-12 h-12 rounded-full bg-surface-elevated" />
      {/* Content skeleton */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="h-4 w-24 bg-surface-elevated rounded" />
          <div className="h-3 w-12 bg-surface-elevated rounded" />
        </div>
        <div className="h-3 w-40 bg-surface-elevated rounded" />
      </div>
    </div>
  )
}

function MessageSkeleton() {
  return (
    <div className="flex-1 flex flex-col gap-4 p-4">
      {/* Header skeleton */}
      <div className="h-14 border-b border-border flex items-center gap-3 px-4">
        <div className="w-8 h-8 rounded-full bg-surface-elevated animate-pulse" />
        <div className="h-4 w-24 bg-surface-elevated rounded animate-pulse" />
      </div>
      {/* Messages skeleton */}
      <div className="flex-1 space-y-4 px-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-surface-elevated animate-pulse flex-shrink-0" />
            <div className={`h-16 ${i % 2 === 0 ? 'w-48' : 'w-64'} bg-surface-elevated rounded-2xl animate-pulse`} />
          </div>
        ))}
      </div>
      {/* Input skeleton */}
      <div className="h-14 border-t border-border flex items-center gap-2 px-4">
        <div className="flex-1 h-10 bg-surface-elevated rounded-full animate-pulse" />
        <div className="w-10 h-10 bg-surface-elevated rounded-full animate-pulse" />
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    authApi.me().then(res => setCurrentUserId(res.data.id)).catch(() => {})

    chatApi.getConversations()
      .then(res => setConversations(res.data?.conversations || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  // When user clicks a conversation, dispatch event to update header
  const handleConversationClick = (convId: string, hasUnread: boolean) => {
    if (hasUnread) {
      window.dispatchEvent(new CustomEvent('messages_read', { detail: { conversationId: convId } }))
    }
    router.push(`/messages/${convId}`)
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-16 z-40 bg-black/80 backdrop-blur-md px-4 h-14 flex items-center border-b border-border">
          <h1 className="font-headline-md text-text-primary">Messages</h1>
        </div>

        {loading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map(i => (
              <ConversationSkeleton key={i} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <p className="text-body-lg mb-2">No conversations yet</p>
            <p className="text-body-sm">Start chatting from someone&apos;s profile!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {conversations.map(conv => {
              const otherUser = conv.participants.find(p => p.id !== currentUserId)
              return (
                <div
                  key={conv.id}
                  className="p-4 flex items-center gap-3 hover:bg-surface-elevated cursor-pointer transition-colors"
                  onClick={() => handleConversationClick(conv.id, conv.unreadCount > 0)}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-surface-base overflow-hidden flex-shrink-0">
                    {otherUser?.avatarUrl ? (
                      <img
                        src={otherUser.avatarUrl}
                        alt={otherUser.displayName || otherUser.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-text-muted">
                        {(otherUser?.displayName || otherUser?.username)?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-text-primary' : 'text-text-primary'}`}>
                          {otherUser?.displayName || otherUser?.username}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-text-muted">
                        {formatTime(conv.lastMessageAt)}
                      </p>
                    </div>
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-medium text-text-primary' : 'text-text-muted'}`}>
                      {conv.lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>

                  {/* Unread badge */}
                  {conv.unreadCount > 0 && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return date.toLocaleDateString()
}