'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import ProfileHeader from '@/components/profile/ProfileHeader'
import PostComposer from '@/components/posts/PostComposer'
import PostCard from '@/components/posts/PostCard'
import QuoteModal from '@/components/posts/QuoteModal'
import { userApi, postApi } from '@/lib/api'

type Tab = 'posts' | 'likes'

interface ProfileData {
  id: string
  username: string
  name: string
  displayName: string | null
  avatarUrl: string | null
  bannerUrl: string | null
  bio: string | null
  location: string | null
  website: string | null
  createdAt: string
  followersCount: number
  followingCount: number
  postsCount: number
  likesCount: number
  likesTodayCount: number
  isFollowing?: boolean
}

interface PostData {
  id: string
  content: string
  mediaUrls: string[]
  likesCount: number
  repostsCount: number
  commentsCount: number
  createdAt: string
  isLiked?: boolean
  isReposted?: boolean
  isPinned?: boolean
  user: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
  parentPost?: {
    id: string
    content: string
    user: { username: string; displayName: string; avatarUrl: string | null }
  }
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export default function ProfilePage() {
  const router = useRouter()
  const routeParams = useParams<{ username: string }>()
  const username = typeof routeParams.username === 'string' ? routeParams.username : ''
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [posts, setPosts] = useState<PostData[]>([])
  const [likes, setLikes] = useState<PostData[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('posts')
  const [quotePost, setQuotePost] = useState<PostData | null>(null)

  // ── Load profile on mount ────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    userApi.getProfile(username)
      .then((res) => {
        setProfile(res.data)
        return postApi.getUserPosts(username)
      })
      .then((res) => setPosts(res.data.posts || []))
      .catch((err) => {
        if (err.response?.status === 404) setError('User not found')
        else setError('Failed to load profile')
      })
      .finally(() => setLoading(false))
  }, [username])

  // ── Tab switch ────────────────────────────────────────────────────────────
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    if (tab === 'posts' && posts.length === 0) {
      postApi.getUserPosts(username).then((res) => setPosts(res.data.posts || []))
    } else if (tab === 'likes' && likes.length === 0) {
      postApi.getUserLikedPosts(username).then((res) => setLikes(res.data.posts || []))
    }
  }

  // ── Follow ────────────────────────────────────────────────────────────────
  const handleFollow = async () => {
    if (!profile) return
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    try {
      if (profile.isFollowing) {
        await userApi.unfollow(profile.id)
        setProfile({ ...profile, isFollowing: false, followersCount: profile.followersCount - 1 })
      } else {
        await userApi.follow(profile.id)
        setProfile({ ...profile, isFollowing: true, followersCount: profile.followersCount + 1 })
      }
    } catch {}
  }

  // ── Like ──────────────────────────────────────────────────────────────────
  const handleLike = async (postId: string, optimisticLiked: boolean) => {
    // Optimistic update on current tab
    const update = (list: PostData[]) =>
      list.map((p) =>
        p.id === postId
          ? { ...p, isLiked: optimisticLiked, likesCount: optimisticLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1) }
          : p
      )

    if (activeTab === 'posts') {
      setPosts((prev) => update(prev).filter((p) => !(p.id === postId && p.isLiked === false)))
    } else {
      setLikes((prev) => update(prev).filter((p) => !(p.id === postId && p.isLiked === false)))
    }

    try {
      const res = await postApi.toggleLike(postId)
      const sync = (list: PostData[]) =>
        list.map((p) => p.id === postId ? { ...p, isLiked: res.data.isLiked, likesCount: res.data.likesCount } : p)
      if (activeTab === 'posts') setPosts((prev) => sync(prev))
      else setLikes((prev) => sync(prev))

      // Refresh likes tab
      setLikes([])
      window.dispatchEvent(new CustomEvent('nexus:like-changed'))
    } catch {}
  }

  // ── Repost ────────────────────────────────────────────────────────────────
  const handleRepost = async (postId: string) => {
    const list = activeTab === 'posts' ? posts : likes
    const post = list.find((p) => p.id === postId)
    if (!post) return

    const optimisticReposted = !post.isReposted
    const update = (arr: PostData[]) =>
      arr.map((p) =>
        p.id === postId
          ? { ...p, isReposted: optimisticReposted, repostsCount: optimisticReposted ? p.repostsCount + 1 : Math.max(0, p.repostsCount - 1) }
          : p
      )

    if (activeTab === 'posts') setPosts(update(posts))
    else setLikes(update(likes))

    try {
      const res = post.isReposted
        ? await postApi.unrepost(postId)
        : await postApi.repost(postId)
      const sync = (arr: PostData[]) =>
        arr.map((p) => p.id === postId ? { ...p, isReposted: res.data.isReposted, repostsCount: res.data.repostsCount } : p)
      if (activeTab === 'posts') setPosts(sync(posts))
      else setLikes(sync(likes))
    } catch {}
  }

  // ── Quote ──────────────────────────────────────────────────────────────────
  const handleQuote = (postId: string) => {
    const list = activeTab === 'posts' ? posts : likes
    const post = list.find((p) => p.id === postId)
    if (post) setQuotePost(post)
  }

  const handleQuoteSubmit = async (content: string) => {
    if (!quotePost) return
    const tempId = `temp-${Date.now()}`
    const quoteData: PostData = {
      id: tempId,
      content,
      mediaUrls: [],
      likesCount: 0,
      repostsCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      isLiked: false,
      isReposted: false,
      isPinned: false,
      user: { id: currentUserId ?? '', username: username, displayName: username, avatarUrl: null },
      parentPost: {
        id: quotePost.id,
        content: quotePost.content,
        user: { username: quotePost.user.username, displayName: quotePost.user.displayName ?? quotePost.user.username, avatarUrl: quotePost.user.avatarUrl },
      },
    }
    setPosts((current) => [quoteData, ...current])
    setQuotePost(null)
    try {
      const res = await postApi.quotePost(quotePost.id, content)
      setPosts((current) => current.map((p) => (p.id === tempId ? { ...res.data, id: res.data.id } : p)))
    } catch {
      setPosts((current) => current.filter((p) => p.id !== tempId))
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (postId: string) => {
    setPosts((current) => current.filter((p) => p.id !== postId))
    if (profile) setProfile({ ...profile, postsCount: Math.max(0, profile.postsCount - 1) })
    try {
      await postApi.deletePost(postId)
    } catch {}
  }

  // ── Pin ───────────────────────────────────────────────────────────────────
  const handlePin = async (postId: string) => {
    try {
      await postApi.pinPost(postId)
      const res = await postApi.getUserPosts(username)
      setPosts(res.data.posts || [])
    } catch {}
  }

  const handleUnpin = async (postId: string) => {
    try {
      await postApi.unpinPost(postId)
      const res = await postApi.getUserPosts(username)
      setPosts(res.data.posts || [])
    } catch {}
  }

  // ── New post ──────────────────────────────────────────────────────────────
  const handlePostCreated = () => {
    if (!profile) return
    setProfile({ ...profile, postsCount: profile.postsCount + 1 })
    if (activeTab !== 'posts') setActiveTab('posts')
    const res = postApi.getUserPosts(username)
    res.then((r) => setPosts(r.data.posts || []))
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

  if (error || !profile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <span className="text-red-500">{error || 'User not found'}</span>
        </div>
      </MainLayout>
    )
  }

  const isOwnProfile = currentUserId === profile.id
  const currentPosts = activeTab === 'posts' ? posts : likes

  const mapPost = (post: PostData) => {
    const avatar = post.user.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${post.user.username}`
    const displayName = post.user.displayName || post.user.username

    return {
      id: post.id,
      user: { name: displayName, username: post.user.username, avatar },
      content: post.content,
      images: post.mediaUrls?.length ? post.mediaUrls : undefined,
      liked: post.isLiked ?? false,
      reposted: post.isReposted ?? false,
      isPinned: post.isPinned ?? false,
      time: timeAgo(post.createdAt),
      stats: {
        comments: post.commentsCount,
        reposts: post.repostsCount,
        likes: post.likesCount,
        views: `${post.likesCount * 10}+`,
      },
      quotedPost: post.parentPost,
    }
  }

  const joinedDate = new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const tabClasses = (tab: Tab) =>
    `flex-1 py-3 text-sm font-bold text-center hover:bg-white/5 transition-colors border-b-2 ${
      activeTab === tab
        ? 'border-primary text-primary'
        : 'border-transparent text-text-muted'
    }`

  return (
    <MainLayout>
      <ProfileHeader
        user={{
          name: profile.displayName || profile.name,
          username: profile.username,
          bio: profile.bio || '',
          location: profile.location || undefined,
          website: profile.website || undefined,
          joinedDate,
          followers: profile.followersCount,
          following: profile.followingCount,
          likes: profile.likesCount,
          likesToday: profile.likesTodayCount,
          avatar: profile.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.username}`,
          banner: profile.bannerUrl || '',
          isFollowing: profile.isFollowing,
        }}
        isOwnProfile={isOwnProfile}
        onFollow={handleFollow}
      />

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button onClick={() => handleTabChange('posts')} className={tabClasses('posts')}>
          Posts
        </button>
        <button onClick={() => handleTabChange('likes')} className={tabClasses('likes')}>
          Likes
        </button>
      </div>

      {/* Post Composer — only on own profile */}
      {isOwnProfile && activeTab === 'posts' && (
        <PostComposer onPostCreated={handlePostCreated} />
      )}

      {/* Posts list */}
      <div className="divide-y divide-border">
        {currentPosts.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            {activeTab === 'posts' && 'ไม่มีโพสต์เลย'}
            {activeTab === 'likes' && 'ยังไม่ได้ like โพสต์ใดเลย'}
          </div>
        ) : (
          currentPosts.map((post) => (
            <PostCard
              key={post.id}
              post={mapPost(post)}
              rawPost={post}
              onLike={handleLike}
              onRepost={handleRepost}
              onQuote={handleQuote}
              onDelete={handleDelete}
              onPin={handlePin}
              onUnpin={handleUnpin}
              currentUsername={currentUserId ?? undefined}
            />
          ))
        )}
      </div>

      {/* Quote Modal */}
      {quotePost && (
        <QuoteModal
          originalPost={{
            id: quotePost.id,
            content: quotePost.content,
            user: {
              username: quotePost.user.username,
              displayName: quotePost.user.displayName || quotePost.user.username,
              avatarUrl: quotePost.user.avatarUrl,
            },
          }}
          onSubmit={handleQuoteSubmit}
          onClose={() => setQuotePost(null)}
        />
      )}
    </MainLayout>
  )
}
