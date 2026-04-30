'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import MainLayout from '@/components/layout/MainLayout'
import { postApi, authApi } from '@/lib/api'
import { formatDistanceToNow } from '@/lib/format'

interface ThreadUser {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

interface ThreadReply {
  id: string
  content: string
  createdAt: string
  likesCount: number
  repostsCount: number
  repliesCount: number
  isLiked: boolean
  isReposted: boolean
  user: ThreadUser
  children: ThreadReply[]
}

interface ThreadPost {
  id: string
  content: string
  mediaUrls: string[]
  createdAt: string
  likesCount: number
  repostsCount: number
  commentsCount: number
  isLiked: boolean
  isReposted: boolean
  isPinned: boolean
  user: ThreadUser
}

interface ThreadData {
  post: ThreadPost
  replies: ThreadReply[]
}

function timeAgo(date: string): string {
  return formatDistanceToNow(date)
}

function avatarSrc(url: string | null | undefined, username: string) {
  return url || `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`
}

// ── Thread Reply Item ─────────────────────────────────────────────────
function ReplyItem({
  reply,
  postId,
  currentUserId,
  onReplyAdded,
  depth = 0,
}: {
  reply: ThreadReply
  postId: string
  currentUserId: string | null
  onReplyAdded: (parentId: string, newReply: ThreadReply) => void
  depth?: number
}) {
  const [liked, setLiked] = useState(reply.isLiked)
  const [likeCount, setLikeCount] = useState(reply.likesCount)
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [children, setChildren] = useState<ThreadReply[]>(reply.children || [])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleLike = async () => {
    const next = !liked
    setLiked(next)
    setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)))
    try {
      if (next) await postApi.toggleLike(reply.id)
      else await postApi.toggleLike(reply.id)
    } catch {
      setLiked(!next)
      setLikeCount((c) => (next ? c - 1 : c + 1))
    }
  }

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await postApi.createReply(reply.id, replyContent.trim())
      const newReply: ThreadReply = {
        ...res.data,
        children: [],
      }
      setChildren((c) => [...c, newReply])
      onReplyAdded(reply.id, newReply)
      setReplyContent('')
      setShowReplyInput(false)
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={`relative ${depth > 0 ? 'ml-6 pl-3 border-l-2 border-border' : ''}`}
    >
      <div className="flex gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
        {/* Avatar */}
        <Link href={`/profile/${reply.user.username}`} className="shrink-0">
          <img
            src={avatarSrc(reply.user.avatarUrl, reply.user.username)}
            alt={reply.user.displayName || reply.user.username}
            className="w-10 h-10 rounded-full"
          />
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <Link
              href={`/profile/${reply.user.username}`}
              className="font-bold text-sm text-text-primary hover:underline"
            >
              {reply.user.displayName || reply.user.username}
            </Link>
            <span className="text-text-muted text-sm">@{reply.user.username}</span>
            <span className="text-text-muted text-sm">·</span>
            <span className="text-text-muted text-sm">{timeAgo(reply.createdAt)}</span>
          </div>
          <p className="text-text-primary text-sm mt-1 break-words">{reply.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-2 text-text-muted">
            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                liked ? 'text-pink-500' : 'hover:text-pink-500'
              }`}
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}
              >
                favorite
              </span>
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {/* Reply */}
            <button
              onClick={() => {
                setShowReplyInput(!showReplyInput)
                setTimeout(() => textareaRef.current?.focus(), 50)
              }}
              className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-lg">chat_bubble</span>
              {reply.repliesCount > 0 && <span>{reply.repliesCount}</span>}
            </button>
          </div>

          {/* Inline reply input */}
          {showReplyInput && (
            <form onSubmit={handleSubmitReply} className="mt-3 flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                className="flex-1 bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-primary transition-colors"
                placeholder={`Reply to @${reply.user.username}...`}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={2}
              />
              <button
                type="submit"
                disabled={!replyContent.trim() || submitting}
                className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                Reply
              </button>
            </form>
          )}

          {/* Nested children */}
          {children.map((child) => (
            <ReplyItem
              key={child.id}
              reply={child}
              postId={postId}
              currentUserId={currentUserId}
              onReplyAdded={onReplyAdded}
              depth={depth + 1}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Post Detail Page ──────────────────────────────────────────────
export default function PostDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const postId = params.id

  const [thread, setThread] = useState<ThreadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [reposted, setReposted] = useState(false)
  const [repostCount, setRepostCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    authApi.me()
      .then((res) => {
        setCurrentUserId(res.data.id)
        setCurrentUsername(res.data.username)
      })
      .catch(() => {})
      .finally(() => fetchThread())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  const fetchThread = async () => {
    try {
      const res = await postApi.getThread(postId)
      setThread(res.data)
      setLiked(res.data.post.isLiked)
      setLikeCount(res.data.post.likesCount)
      setReposted(res.data.post.isReposted)
      setRepostCount(res.data.post.repostsCount)
    } catch {
      setError('ไม่พบโพสต์นี้')
    } finally {
      setLoading(false)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [replyContent])

  const handleLike = async () => {
    if (!thread) return
    const next = !liked
    setLiked(next)
    setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)))
    try {
      await postApi.toggleLike(postId)
    } catch {
      setLiked(!next)
      setLikeCount((c) => (next ? c - 1 : c + 1))
    }
  }

  const handleRepost = async () => {
    if (!thread) return
    const next = !reposted
    setReposted(next)
    setRepostCount((c) => (next ? c + 1 : Math.max(0, c - 1)))
    try {
      if (next) await postApi.repost(postId)
      else await postApi.unrepost(postId)
    } catch {
      setReposted(!next)
      setRepostCount((c) => (next ? c - 1 : c + 1))
    }
  }

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await postApi.createReply(postId, replyContent.trim())
      const newReply: ThreadReply = {
        ...res.data,
        children: [],
      }
      setThread((t) =>
        t ? { ...t, replies: [...t.replies, newReply], post: { ...t.post, commentsCount: t.post.commentsCount + 1 } } : t
      )
      setReplyContent('')
      setTimeout(() => textareaRef.current?.focus(), 50)
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  // Add nested reply to correct parent
  const handleReplyAdded = (parentId: string, newReply: ThreadReply) => {
    const addToParent = (replies: ThreadReply[]): ThreadReply[] =>
      replies.map((r) =>
        r.id === parentId
          ? { ...r, repliesCount: r.repliesCount + 1, children: [...(r.children || []), newReply] }
          : { ...r, children: addToParent(r.children || []) }
      )
    setThread((t) =>
      t ? { ...t, replies: addToParent(t.replies) } : t
    )
  }

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return n.toString()
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <span className="text-text-muted">กำลังโหลด...</span>
        </div>
      </MainLayout>
    )
  }

  if (error || !thread) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64 flex-col gap-4">
          <span className="text-red-500">{error || 'ไม่พบโพสต์'}</span>
          <button onClick={() => router.back()} className="text-primary hover:underline text-sm">
            ← กลับ
          </button>
        </div>
      </MainLayout>
    )
  }

  const { post, replies } = thread

  return (
    <MainLayout>
      {/* Header */}
      <div className="sticky top-16 z-40 bg-black/80 backdrop-blur-md px-4 h-14 flex items-center gap-4 border-b border-border">
        <button onClick={() => router.back()} className="p-1 rounded-full hover:bg-surface-elevated text-text-primary">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h1 className="font-bold text-xl text-text-primary">Thread</h1>
      </div>

      {/* Main post */}
      <article className="p-4 border-b border-border">
        <div className="flex gap-3">
          {/* Avatar */}
          <Link href={`/profile/${post.user.username}`} className="shrink-0">
            <img
              src={avatarSrc(post.user.avatarUrl, post.user.username)}
              alt={post.user.displayName || post.user.username}
              className="w-12 h-12 rounded-full"
            />
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <Link
                href={`/profile/${post.user.username}`}
                className="font-bold text-text-primary hover:underline"
              >
                {post.user.displayName || post.user.username}
              </Link>
              <span className="text-text-muted">@{post.user.username}</span>
              <span className="text-text-muted">·</span>
              <span className="text-text-muted">{timeAgo(post.createdAt)}</span>
            </div>
            <p className="text-text-primary mt-1 leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>

            {/* Images */}
            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-border">
                {post.mediaUrls.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full object-cover max-h-96" />
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3 text-text-muted border-t border-border pt-3">
              <button
                onClick={() => textareaRef.current?.focus()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">chat_bubble</span>
                {post.commentsCount > 0 && <span className="text-xs">{formatCount(post.commentsCount)}</span>}
              </button>
              <button
                onClick={handleRepost}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  reposted
                    ? 'text-green-500 hover:text-green-400 bg-green-500/10'
                    : 'hover:text-green-500 hover:bg-green-500/10'
                }`}
              >
                <span className="material-symbols-outlined text-lg">repeat</span>
                {repostCount > 0 && <span className="text-xs">{formatCount(repostCount)}</span>}
              </button>
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  liked ? 'text-pink-500 hover:text-pink-400 bg-pink-500/10' : 'hover:text-pink-500 hover:bg-pink-500/10'
                }`}
              >
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}
                >
                  favorite
                </span>
                {likeCount > 0 && <span className="text-xs">{formatCount(likeCount)}</span>}
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Reply input */}
      {currentUserId && (
        <form
          onSubmit={handleSubmitReply}
          className="flex gap-3 px-4 py-3 border-b border-border items-end"
        >
          <Link href={`/profile/${currentUsername}`} className="shrink-0">
            <img
              src={`https://api.dicebear.com/7.x/identicon/svg?seed=${currentUsername}`}
              alt={currentUsername || 'you'}
              className="w-10 h-10 rounded-full"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              className="w-full bg-transparent border-none outline-none resize-none text-text-primary placeholder-text-muted text-base leading-relaxed"
              placeholder={`Reply to @${post.user.username}...`}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={1}
            />
            {replyContent.trim() && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-text-muted">
                  Replying to <span className="text-primary">@{post.user.username}</span>
                </span>
                <button
                  type="submit"
                  disabled={!replyContent.trim() || submitting}
                  className="bg-primary text-white text-sm font-bold px-4 py-1.5 rounded-full hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  Reply
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* Replies thread */}
      <div>
        {replies.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            No replies yet. Be the first to reply!
          </div>
        ) : (
          replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              postId={postId}
              currentUserId={currentUserId}
              onReplyAdded={handleReplyAdded}
              depth={0}
            />
          ))
        )}
      </div>
    </MainLayout>
  )
}
