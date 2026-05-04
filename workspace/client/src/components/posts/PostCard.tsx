'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lightbox } from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import PostActions from './PostActions'
import PostDropdown from './PostDropdown'

// Detect if a URL is a video based on extension
function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov|avi|mkv|ogg|ogv)(\?.*)?$/i.test(url)
}

// Pattern order: @mentions, #hashtags, URLs
function parseContent(content: string): React.ReactNode[] {
  const parts = content.split(/(@[\wก-๙]+)|(#[฀-๿\w]+)|(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) => {
    if (!part) return part

    // @mention
    if (part.startsWith('@')) {
      const username = part.slice(1)
      return (
        <Link
          key={i}
          href={`/profile/${username}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      )
    }

    // #hashtag
    if (part.startsWith('#')) {
      const tag = part.slice(1)
      return (
        <Link
          key={i}
          href={`/hashtag/${tag}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      )
    }

    // External URL
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }

    return part
  })
}

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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const buttonRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const isOwnPost = currentUsername === post.user.username
  const likeCount =
    typeof post.stats.likes === 'number'
      ? post.stats.likes
      : parseInt(post.stats.likes.toString().replace(/[^0-9]/g, '')) * 1000

  // Separate images and videos from media URLs
  const mediaImages = post.images?.filter((url) => !isVideo(url)) ?? []
  const mediaVideos = post.images?.filter((url) => isVideo(url)) ?? []

  const openLightbox = (index: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setLightboxIndex(index)
  }

  const closeLightbox = () => setLightboxIndex(null)

  const handleLike = () => {
    console.log('[PostCard] handleLike called, post.id:', post.id, 'current liked:', liked);
    onLike?.(post.id, !liked)
  }

  const handleClick = (e: React.MouseEvent) => {
    // Stop navigation if clicking interactive elements OR if user selected text
    const target = e.target as HTMLElement
    console.log('[PostCard] handleClick called, target:', target.tagName, 'class:', target.className, 'closest a:', !!target.closest('a'), 'post.id:', post.id)
    if (
      target.closest('a') ||
      target.closest('button') ||
      target.closest('[data-no-nav]')
    ) return
    if (window.getSelection()?.toString().length) return
    if (onClick) {
      onClick(e)
    } else {
      console.log('[PostCard] navigating to:', `/posts/${post.id}`)
      router.push(`/posts/${post.id}`)
    }
  }

  return (
    <>
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
        <Link
          href={`/profile/${post.user.username}`}
          className="shrink-0 w-10 h-10"
          onClick={(e) => e.stopPropagation()}
        >
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
              <Link
                href={`/profile/${post.user.username}`}
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-bold text-text-primary truncate">
                  {post.user.name}
                </span>
              </Link>
              <Link
                href={`/profile/${post.user.username}`}
                className="text-text-muted truncate hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                @{post.user.username}
              </Link>
              <span className="text-text-muted">·</span>
              <Link
                href={`/posts/${post.id}`}
                className="text-text-muted hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
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
          <p className="text-text-primary mt-1 leading-relaxed">{useMemo(() => parseContent(post.content), [post.content])}</p>

          {/* Quoted/Embedded Post */}
          {post.quotedPost && (
            <div className="mt-3 border border-border rounded-xl p-3 hover:bg-white/5 transition-colors cursor-pointer">
              <div className="flex items-start gap-2">
                <Link
                  href={`/profile/${post.quotedPost.user.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 w-8 h-8"
                >
                  <img
                    src={
                      post.quotedPost.user.avatarUrl ||
                      `https://api.dicebear.com/7.x/identicon/svg?seed=${post.quotedPost.user.username}`
                    }
                    alt={post.quotedPost.user.displayName || post.quotedPost.user.username}
                    className="w-8 h-8 rounded-full"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${post.quotedPost.user.username}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline"
                  >
                    <span className="font-bold text-text-primary text-sm">
                      {post.quotedPost.user.displayName || post.quotedPost.user.username}
                    </span>
                    <span className="text-text-muted text-sm ml-1">
                      @{post.quotedPost.user.username}
                    </span>
                  </Link>
                  <Link
                    href={`/posts/${post.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-text-primary text-sm mt-1 break-words">
                      {useMemo(() => parseContent(post.quotedPost!.content), [post.quotedPost!.content])}
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Gallery Grid — only when > 1 image */}
          {mediaImages.length > 1 && (
            <div
              className="block mt-3 rounded-2xl overflow-hidden border border-border cursor-pointer"
              style={{ maxHeight: '400px' }}
              onClick={handleClick}
            >
              <div
                className="grid gap-0.5"
                style={{
                  gridTemplateColumns: mediaImages.length === 2 ? '1fr 1fr' : '1fr 1fr',
                  gridTemplateRows: mediaImages.length <= 2 ? '1fr' : '1fr 1fr',
                }}
              >
                {mediaImages.map((img, i) => (
                  <div
                    key={i}
                    className="overflow-hidden"
                    style={{ maxHeight: mediaImages.length >= 3 ? '200px' : '400px' }}
                  >
                    <img
                      alt=""
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      src={img}
                      style={{ maxHeight: mediaImages.length >= 3 ? '200px' : '400px' }}
                      onClick={openLightbox(i)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single Image — only when exactly 1 image */}
          {mediaImages.length === 1 && (
            <div
              className="block mt-3 rounded-2xl overflow-hidden border border-border cursor-pointer"
              style={{ maxHeight: '400px' }}
              onClick={handleClick}
            >
              <img
                alt=""
                className="w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxHeight: '400px' }}
                src={mediaImages[0]}
                onClick={openLightbox(0)}
              />
            </div>
          )}

          {/* Video */}
          {mediaVideos.length > 0 && (
            <div
              className="block mt-3 rounded-2xl overflow-hidden border border-border cursor-pointer relative group"
              style={{ maxHeight: '400px' }}
              onClick={handleClick}
            >
              <video
                src={mediaVideos[0]}
                className="w-full object-cover cursor-pointer"
                style={{ maxHeight: '400px' }}
                onClick={(e) => {
                  e.stopPropagation()
                  // Navigate to thread to play video
                  router.push(`/posts/${post.id}`)
                }}
                controls
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

    {/* Lightbox for images */}
    {lightboxIndex !== null && mediaImages.length > 0 ? (
      <Lightbox
        open
        close={closeLightbox}
        slides={mediaImages.map((src) => ({ src }))}
        index={lightboxIndex}
        render={{
          // Hide navigation buttons when only 1 image
          buttonPrev: mediaImages.length > 1 ? undefined : () => null,
          buttonNext: mediaImages.length > 1 ? undefined : () => null,
        }}
      />
    ) : null}
    </>
  )
}
