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
  // For quote posts
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      return (sessionStorage.getItem('profileTab') as Tab) || 'posts'
    }
    return 'posts'
  })
  const activeTabRef = useRef(activeTab)
  const [quotePost, setQuotePost] = useState<PostData | null>(null)

  // Switch tab — fetch data accordingly
  const switchTab = async (tab: Tab) => {
    setActiveTab(tab)
    activeTabRef.current = tab
    sessionStorage.setItem('profileTab', tab)
    const token = localStorage.getItem('token')
    if (!token || !profile) return

    // Use currentUsername from auth state — always set before user sees page
    const username = currentUsername || profile.username

    try {
      if (tab === 'posts') {
        const res = await postApi.getUserPosts(username)
        setPosts(res.data.posts || [])
      } else if (tab === 'likes') {
        const res = await postApi.getUserLikedPosts(username)
        setPosts(res.data.posts || [])
      }
    } catch {}
  }

  // Fetch user + profile + posts on mount (resets to current active tab)
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchCurrentUser(token)
  }, [username])

  const fetchCurrentUser = (token: string) => {
    fetch('http://localhost:3001/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((me) => {
        setCurrentUserId(me.id)
        setCurrentUsername(me.username)
        return userApi.getProfile(username)
      })
      .then((res) => {
        setProfile(res.data)
        // Fetch data based on current active tab
        if (activeTabRef.current === 'likes') {
          return postApi.getUserLikedPosts(username)
        }
        return postApi.getUserPosts(username)
      })
      .then((res) => setPosts(res.data.posts || []))
      .catch((err) => {
        if (err.response?.status === 404) {
          setError('User not found')
        } else {
          setError('Failed to load profile')
        }
      })
      .finally(() => setLoading(false))
  }

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
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
      }
    }
  }

  // ── Like ──────────────────────────────────────────────────────────────
  const handleLike = async (postId: string, optimisticLiked: boolean) => {
    const previousPosts = [...posts]
    setPosts((current) =>
      current.map((p) =>
        p.id === postId
          ? { ...p, isLiked: optimisticLiked, likesCount: optimisticLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1) }
          : p
      ).filter((p) => !(p.id === postId && p.isLiked === false && activeTab === 'likes'))
    )
    try {
      const res = await postApi.toggleLike(postId)
      setPosts((current) =>
        current.map((p) => p.id === postId ? { ...p, isLiked: res.data.isLiked, likesCount: res.data.likesCount } : p)
      )
    } catch {
      setPosts(previousPosts)
    }
  }

  // ── Repost ─────────────────────────────────────────────────────────────
  const handleRepost = async (postId: string) => {
    const previousPosts = [...posts]
    const post = posts.find((p) => p.id === postId)
    if (!post) return

    const optimisticReposted = !post.isReposted

    setPosts((current) =>
      current.map((p) =>
        p.id === postId
          ? {
              ...p,
              isReposted: optimisticReposted,
              repostsCount: optimisticReposted
                ? p.repostsCount + 1
                : Math.max(0, p.repostsCount - 1),
            }
          : p
      )
    )

    try {
      let res: any
      if (post.isReposted) {
        res = await postApi.unrepost(postId)
      } else {
        res = await postApi.repost(postId)
      }
      setPosts((current) =>
        current.map((p) =>
          p.id === postId
            ? { ...p, isReposted: res.data.isReposted, repostsCount: res.data.repostsCount }
            : p
        )
      )
    } catch {
      setPosts(previousPosts)
    }
  }

  // ── Quote ──────────────────────────────────────────────────────────────
  const handleQuote = (postId: string) => {
    const post = posts.find((p) => p.id === postId)
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
      user: {
        id: currentUserId ?? '',
        username: currentUsername ?? '',
        displayName: currentUsername ?? '',
        avatarUrl: null,
      },
      parentPost: {
        id: quotePost.id,
        content: quotePost.content,
        user: {
          username: quotePost.user.username,
          displayName: quotePost.user.displayName ?? quotePost.user.username,
          avatarUrl: quotePost.user.avatarUrl,
        },
      },
    }
    setPosts((current) => [quoteData, ...current])
    setQuotePost(null)
    try {
      const res = await postApi.quotePost(quotePost.id, content)
      setPosts((current) =>
        current.map((p) => (p.id === tempId ? { ...res.data, id: res.data.id } : p))
      )
    } catch {
      setPosts((current) => current.filter((p) => p.id !== tempId))
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (postId: string) => {
    setPosts((current) => current.filter((p) => p.id !== postId))
    if (profile) setProfile({ ...profile, postsCount: Math.max(0, profile.postsCount - 1) })
    try {
      await postApi.deletePost(postId)
    } catch {
      if (profile) postApi.getUserPosts(profile.username).then((res) => setPosts(res.data.posts || []))
    }
  }

  // ── Pin ────────────────────────────────────────────────────────────────
  const handlePin = async (postId: string) => {
    try {
      await postApi.pinPost(postId)
      if (profile) postApi.getUserPosts(profile.username).then((res) => setPosts(res.data.posts || []))
    } catch {}
  }

  const handleUnpin = async (postId: string) => {
    try {
      await postApi.unpinPost(postId)
      if (profile) postApi.getUserPosts(profile.username).then((res) => setPosts(res.data.posts || []))
    } catch {}
  }

  const handlePostCreated = () => {
    if (!profile) return
    setProfile({ ...profile, postsCount: profile.postsCount + 1 })
    if (activeTab !== 'posts') {
      setActiveTab('posts')
    }
    postApi.getUserPosts(profile.username).then((res) => setPosts(res.data.posts || []))
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

  const mapPost = (post: PostData) => {
    const avatar = post.user.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${post.user.username}`
    const displayName = post.user.displayName || post.user.username

    return {
      id: post.id,
      user: {
        name: displayName,
        username: post.user.username,
        avatar,
      },
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
        <button onClick={() => switchTab('posts')} className={tabClasses('posts')}>
          Posts
        </button>
        <button onClick={() => switchTab('likes')} className={tabClasses('likes')}>
          Likes
        </button>
      </div>

      {/* Post Composer — only on own profile */}
      {isOwnProfile && activeTab === 'posts' && (
        <PostComposer onPostCreated={handlePostCreated} />
      )}

      {/* Posts list */}
      <div className="divide-y divide-border">
        {posts.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            {activeTab === 'posts' && 'ไม่มีโพสต์เลย'}
            {activeTab === 'likes' && 'ยังไม่ได้ like โพสต์ใดเลย'}
          </div>
        ) : (
          posts.map((post) => (
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
              currentUsername={currentUsername ?? undefined}
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
