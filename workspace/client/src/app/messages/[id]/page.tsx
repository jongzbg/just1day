'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { chatApi } from '@/lib/chatApi'
import { useChatSocket } from '@/hooks/useChatSocket'
import { MessageSkeleton } from '@/components/Skeleton'

interface Message {
  id: string
  clientId?: string  // for optimistic matching
  content?: string
  mediaUrl?: string
  createdAt: string
  sender: { id: string; username: string; displayName?: string; avatarUrl?: string }
  status?: 'pending' | 'sent' | 'failed'
  isOptimistic?: boolean
}

interface Conversation {
  id: string
  isGroup: boolean
  participants: { id: string; username: string; displayName?: string; avatarUrl?: string; lastReadAt?: string }[]
}

export default function ChatRoomPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const conversationId = params.id

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; displayName?: string; avatarUrl?: string } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch current user
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetch('http://localhost:3001/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setCurrentUserId(data.id); setCurrentUser(data) })
      .catch(() => router.push('/login'))
  }, [router])

  // Load conversation + initial messages
  useEffect(() => {
    if (!conversationId || !currentUserId) return

    chatApi.getConversation(conversationId)
      .then(res => setConversation(res.data))
      .catch(() => { router.push('/messages'); return })
      .finally(() => setLoading(false))

    chatApi.getMessages(conversationId)
      .then(res => {
        // Reverse messages to show oldest first (newest at bottom) - standard chat UX
        const msgs = res.data?.messages || []
        setMessages([...msgs].reverse())
        setHasMore(!!res.data?.nextCursor)
      })

    // Mark as read
    chatApi.markAsRead(conversationId).then(() => {
      // Dispatch event to update Header unread count
      window.dispatchEvent(new CustomEvent('messages_read', { detail: { conversationId } }))
    })
  }, [conversationId, currentUserId, router])

  // WebSocket: real-time messages
  const { joinConversation, leaveConversation, sendMessage, startTyping, stopTyping } = useChatSocket({
    onNewMessage: useCallback((message: Message) => {
      // Skip if already added optimistically (matched by clientId)
      setMessages(prev => {
        if (prev.some(m => m.clientId === message.clientId)) {
          // Replace optimistic message with server-confirmed one
          return prev.map(m =>
            m.clientId === message.clientId
              ? { ...message, status: 'sent' as const }
              : m
          )
        }
        // New message from others
        if (message.sender.id !== currentUserId) {
          return [...prev, { ...message, status: 'sent' }]
        }
        return prev
      })
      // Scroll to bottom
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }, [currentUserId]),

    onMessageError: useCallback((data: { conversationId: string; clientId?: string; error: string }) => {
      // Mark optimistic message as failed
      if (data.clientId) {
        setMessages(prev =>
          prev.map(m =>
            m.clientId === data.clientId
              ? { ...m, status: 'failed' as const }
              : m
          )
        )
      }
    }, []),

    onUserTyping: useCallback((data: { conversationId: string; userId: string; username: string }) => {
      if (data.userId === currentUserId) return
      setTypingUsers(prev => new Map(prev).set(data.userId, data.username))
    }, [currentUserId]),

    onUserStoppedTyping: useCallback((data: { conversationId: string; userId: string }) => {
      setTypingUsers(prev => {
        const next = new Map(prev)
        next.delete(data.userId)
        return next
      })
    }, []),
  })

  // Join room when conversation loaded
  useEffect(() => {
    if (conversationId && !loading) {
      joinConversation(conversationId)
      return () => leaveConversation(conversationId)
    }
  }, [conversationId, loading, joinConversation, leaveConversation])

  // Scroll to bottom on new messages (except when loading more)
  useEffect(() => {
    if (!loadingMore) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loadingMore])

  // Load more messages (scroll to top)
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || messages.length === 0) return
    setLoadingMore(true)
    const oldestMessage = messages[0]
    try {
      const res = await chatApi.getMessages(conversationId, oldestMessage.id)
      const olderMessages = (res.data?.messages || []).reverse()
      setMessages(prev => [...olderMessages, ...prev])
      setHasMore(!!res.data?.nextCursor)
    } finally {
      setLoadingMore(false)
    }
  }, [conversationId, hasMore, loadingMore, messages])

  // Infinite scroll: load more when near top
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget
    if (scrollTop < 100 && hasMore && !loadingMore) {
      loadMore()
    }
  }, [loadMore, hasMore, loadingMore])

  // Send message
  const handleSend = useCallback(async () => {
    const text = newMessage.trim()
    if (!text || !conversationId) return

    const clientId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Optimistic message
    const optimisticMessage: Message = {
      id: clientId,
      clientId,
      content: text,
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUser?.id || currentUserId,
        username: currentUser?.username || '',
        displayName: currentUser?.displayName,
        avatarUrl: currentUser?.avatarUrl,
      },
      status: 'pending',
      isOptimistic: true,
    }
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    stopTyping(conversationId)

    // Send via WebSocket
    sendMessage({ conversationId, content: text, clientId })
  }, [newMessage, conversationId, currentUserId, sendMessage, stopTyping])

  // Handle typing input
  const handleTyping = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)

    // Throttle typing events
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    startTyping(conversationId)
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(conversationId)
    }, 2000)
  }, [conversationId, startTyping, stopTyping])

  // Retry failed message
  const handleRetry = useCallback((msg: Message) => {
    if (!msg.content || !conversationId) return
    const clientId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setMessages(prev =>
      prev.map(m => m.clientId === msg.clientId ? { ...m, clientId, status: 'pending' as const } : m)
    )
    sendMessage({ conversationId, content: msg.content, clientId })
  }, [conversationId, sendMessage])

  if (loading) {
    return (
      <MainLayout>
        <MessageSkeleton />
      </MainLayout>
    )
  }

  const otherUser = conversation?.participants.find(p => p.id !== currentUserId)

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="sticky top-16 z-40 bg-black/80 backdrop-blur-md px-4 h-14 flex items-center gap-3 border-b border-border">
          <button onClick={() => router.push('/messages')} className="hover:bg-surface-elevated p-2 rounded-full">
            <span className="material-symbols-outlined text-text-primary">arrow_back</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-surface-base overflow-hidden">
            {otherUser?.avatarUrl ? (
              <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-text-muted">
                {(otherUser?.displayName || otherUser?.username)?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">
              {otherUser?.displayName || otherUser?.username}
            </p>
            <p className="text-xs text-text-muted">@{otherUser?.username}</p>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar"
          onScroll={handleScroll}
        >
          {loadingMore && (
            <div className="text-center py-2">
              <span className="material-symbols-outlined text-text-muted animate-spin text-sm">progress_activity</span>
            </div>
          )}

          {messages.map((msg, i) => {
            const isMine = msg.sender.id === currentUserId
            return (
              <div key={msg.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                {/* Spacer for alignment */}
                {!isMine && <div className="w-8 flex-shrink-0" />}

                <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5 group`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-surface-elevated text-text-primary rounded-bl-md'
                  } ${msg.status === 'pending' ? 'opacity-60' : ''} ${msg.status === 'failed' ? 'border border-red-500' : ''}`}>
                    {msg.content}
                  </div>
                  {/* Timestamp - only visible on hover */}
                  <div className={`flex items-center gap-1 px-2 ${isMine ? 'flex-row-reverse' : ''} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                    <span className="text-xs text-text-muted">{formatMsgTime(msg.createdAt)}</span>
                    {isMine && msg.status === 'pending' && (
                      <span className="material-symbols-outlined text-text-muted text-xs">schedule</span>
                    )}
                    {isMine && msg.status === 'failed' && (
                      <button onClick={() => handleRetry(msg)} className="text-red-500 text-xs hover:underline">
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {typingUsers.size > 0 && (
            <div className="flex items-center gap-2 px-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-text-muted">
                {Array.from(typingUsers.values()).join(', ')} is typing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="flex items-end gap-2 max-w-2xl mx-auto">
            <textarea
              value={newMessage}
              onChange={handleTyping}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Message..."
              rows={1}
              className="flex-1 bg-surface-elevated border border-border rounded-2xl px-4 py-2 text-text-primary placeholder-text-muted resize-none focus:border-primary focus:ring-0 custom-scrollbar"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:opacity-90 disabled:opacity-30 transition-opacity"
            >
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

function formatMsgTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}