'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PostActions from './PostActions'
import PostDropdown from './PostDropdown'

interface Post {
  id: string
  user: {
    name: string
    username: string
    avatar: string
  }
  content: string
  image?: string
  images?: string[]
  time: string
  stats: {
    comments: number | string
    reposts: number | string
    likes: number | string
    views: string
  }
  liked?: boolean
  reposted?: boolean
  isPinned?: boolean
  // Repost metadata — when viewing a reposted post
  repostedBy?: { username: string; displayName?: string; avatar?: string }
  // Original post when this IS a quote
  quotedPost?: {
    id: string
    content: string
    user: { username: string; displayName?: string; avatarUrl?: string | null }
  }
}

interface PostCardProps {
  post: Post
  /** Raw API post — passed through to onComment so CommentModal can access user.id */
  rawPost?: any
  onLike?: (postId: string, liked: boolean) => void
  onRepost?: (postId: string) => void
  onQuote?: (postId: string) => void
  onDelete?: (postId: string) => void
  onPin?: (postId: string) => void
  onUnpin?: (postId: string) => void
  onComment?: (post: any) => void
  /** Custom click handler. If not provided, PostCard navigates to /posts/:id */
  onClick?: (e: React.MouseEvent) => void
  currentUsername?: string
}

export default function PostCard({ post, rawPost, onLike, onRepost, onQuote, onDelete, onPin, onUnpin, onComment, onClick, currentUsername }: PostCardProps) {
  const liked = post.liked ?? false
  const reposted = post.reposted ?? false
  const isPinned = post.isPinned ?? false
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const isOwnPost = currentUsername === post.user.username
  const likeCount =
    typeof post.stats.likes === 'number'
      ? post.stats.likes
      : parseInt(post.stats.likes.toString().replace(/[^0-9]/g, '')) * 1000

  const handleLike = () => {
    onLike?.(post.id, !liked)
  }

  const handleClick = (e: React.MouseEvent) => {
    // Stop navigation if clicking interactive elements OR if user selected text
    const target = e.target as HTMLElement
    if (
      target.closest('a') ||
      target.closest('button') ||
      target.closest('[data-no-nav]')
    ) return
    if (window.getSelection()?.toString().length) return
    if (onClick) {
      onClick(e)
    } else {
      router.push(`/posts/${post.id}`)
    }
  }

  return (
    <article
      onClick={handleClick}
      className="p-4 border-b border-border hover:bg-[#16181c]/50 transition-colors cursor-pointer"
    >
      {/* Reposted by banner */}
      {post.repostedBy && (
        <div className="flex items-center gap-1.5 mb-1 ml-12 text-text-muted text-sm">
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>repeat</span>
          <span>
            {post.repostedBy.username === currentUsername ? (
              <span>You reposted</span>
            ) : (
              <>
                <Link
                  href={`/profile/${post.repostedBy.username}`}
                  className="hover:underline font-medium"
                >
                  @{post.repostedBy.username}
                </Link>
                {' '}reposted
              </>
            )}
          </span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <Link href={`/profile/${post.user.username}`} className="shrink-0">
          <img
            alt={post.user.name}
            className="w-10 h-10 rounded-full hover:opacity-80 transition-opacity"
            src={post.user.avatar}
          />
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <Link href={`/profile/${post.user.username}`} className="hover:underline">
                <span className="font-bold text-text-primary truncate">
                  {post.user.name}
                </span>
              </Link>
              <Link href={`/profile/${post.user.username}`} className="text-text-muted truncate hover:underline">
                @{post.user.username}
              </Link>
              <span className="text-text-muted">·</span>
              <Link href={`/posts/${post.id}`} className="text-text-muted hover:underline">
                {post.time}
              </Link>
            </div>

            {/* ... dropdown — only for own posts */}
            {isOwnPost && (
              <div ref={buttonRef} className="relative shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setDropdownOpen((prev) => !prev)
                  }}
                  className="p-1.5 rounded-full hover:bg-[#1D9BF0]/20 text-text-muted hover:text-[#1D9BF0] transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">more_horiz</span>
                </button>
                {dropdownOpen && (
                  <PostDropdown
                    postId={post.id}
                    isPinned={isPinned}
                    onDelete={onDelete ?? (() => {})}
                    onPin={onPin ?? (() => {})}
                    onUnpin={onUnpin ?? (() => {})}
                    onClose={() => setDropdownOpen(false)}
                  />
                )}
              </div>
            )}
          </div>

          {/* Text */}
          <p className="text-text-primary mt-1 leading-relaxed">{post.content}</p>

          {/* Quoted/Embedded Post */}
          {post.quotedPost && (
            <div className="mt-3 border border-border rounded-xl p-3 hover:bg-white/5 transition-colors">
              <div className="flex items-start gap-2">
                <img
                  src={
                    post.quotedPost.user.avatarUrl ||
                    `https://api.dicebear.com/7.x/identicon/svg?seed=${post.quotedPost.user.username}`
                  }
                  alt={post.quotedPost.user.displayName || post.quotedPost.user.username}
                  className="w-8 h-8 rounded-full shrink-0 mt-0.5"
                />
                <div className="min-w-0">
                  <span className="font-bold text-text-primary text-sm">
                    {post.quotedPost.user.displayName || post.quotedPost.user.username}
                  </span>
                  <span className="text-text-muted text-sm ml-1">
                    @{post.quotedPost.user.username}
                  </span>
                  <p className="text-text-primary text-sm mt-1 break-words">
                    {post.quotedPost.content}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Gallery Grid */}
          {post.images && post.images.length > 1 && (
            <div
              className="mt-3 rounded-2xl overflow-hidden border border-border"
              style={{ maxHeight: '400px' }}
            >
              <div
                className="grid gap-0.5"
                style={{
                  gridTemplateColumns: post.images.length === 2 ? '1fr 1fr' : '1fr 1fr',
                  gridTemplateRows: post.images.length <= 2 ? '1fr' : '1fr 1fr',
                }}
              >
                {post.images.map((img, i) => (
                  <div key={i} className="overflow-hidden" style={{ maxHeight: post.images!.length >= 3 ? '200px' : '400px' }}>
                    <img
                      alt=""
                      className="w-full h-full object-cover"
                      src={img}
                      style={{ maxHeight: post.images!.length >= 3 ? '200px' : '400px' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single Image */}
          {post.images && post.images.length === 1 && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-border">
              <img
                alt=""
                className="w-full object-cover"
                style={{ maxHeight: '400px' }}
                src={post.images[0]}
              />
            </div>
          )}

          {/* Actions */}
          <PostActions
            postId={post.id}
            liked={liked}
            reposted={reposted}
            likeCount={likeCount}
            repostCount={typeof post.stats.reposts === 'number' ? post.stats.reposts : 0}
            commentCount={typeof post.stats.comments === 'number' ? post.stats.comments : 0}
            viewCount={post.stats.views}
            onLike={handleLike}
            onRepost={() => onRepost?.(post.id)}
            onQuote={() => onQuote?.(post.id)}
            onComment={() => onComment?.(rawPost ?? post)}
            post={rawPost ?? post}
            isReposted={reposted}
          />
        </div>
      </div>
    </article>
  )
}
