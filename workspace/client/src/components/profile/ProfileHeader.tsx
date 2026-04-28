'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

interface ProfileHeaderProps {
  user: {
    name: string
    username: string
    bio: string
    location?: string
    website?: string
    joinedDate: string
    followers: number
    following: number
    likes: number
    likesToday?: number
    avatar: string
    banner: string
    isFollowing?: boolean
  }
  isOwnProfile?: boolean
  onFollow?: () => void
}

export default function ProfileHeader({ user, isOwnProfile = false, onFollow }: ProfileHeaderProps) {
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false)
  const avatarDropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(e.target as Node)) {
        setAvatarDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAvatarDropdownOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return (
    <>
      {/* Banner */}
      <section className="relative">
        <div className="h-48 w-full bg-surface-elevated">
          {user.banner ? (
            <img
              alt="Profile banner"
              className="w-full h-full object-cover opacity-80"
              src={user.banner}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-primary/30 to-black" />
          )}
        </div>
        <div className="px-4 -mt-16 flex justify-between items-end relative z-10">
          <div ref={avatarDropdownRef} className="relative">
            <button
              onClick={() => setAvatarDropdownOpen((prev) => !prev)}
              className="p-1 bg-black rounded-full hover:ring-2 hover:ring-primary transition-all cursor-pointer"
            >
              <img
                alt="Profile avatar"
                className="w-32 h-32 rounded-full object-cover border-4 border-black"
                src={user.avatar}
              />
            </button>
            {avatarDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-48 bg-[#200D21] border border-[#3F3F3F] rounded-xl shadow-2xl z-50 overflow-hidden">
                <Link
                  href="/edit-profile"
                  onClick={() => setAvatarDropdownOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#3F3F3F]/30 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[#1D9BF0]">edit</span>
                  <span className="text-text-primary font-medium">Edit Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#3F3F3F]/30 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-red-500">logout</span>
                  <span className="text-text-primary font-medium">Log out</span>
                </button>
              </div>
            )}
          </div>
          {isOwnProfile ? (
            <Link
              href="/edit-profile"
              className="mb-4 px-6 py-2 border border-border text-text-primary font-bold rounded-full hover:bg-surface-elevated transition-colors"
            >
              Edit Profile
            </Link>
          ) : (
            <button
              onClick={() => onFollow?.()}
              className={`mb-4 px-6 py-2 font-bold rounded-full transition-colors ${
                user.isFollowing
                  ? 'border border-border text-text-primary hover:bg-red-500/10 hover:border-red-500 hover:text-red-500'
                  : 'bg-primary text-white hover:opacity-90'
              }`}
            >
              {user.isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
        <div className="px-4 mt-4 space-y-3">
          <div>
            <h2 className="text-display-lg text-text-primary">{user.name}</h2>
            <p className="text-text-muted">@{user.username}</p>
          </div>
          <p className="text-text-primary leading-relaxed">{user.bio}</p>
          <div className="flex flex-wrap gap-4 text-text-muted text-body-sm">
            {user.location && (
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">location_on</span>
                {user.location}
              </div>
            )}
            {user.website && (
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">link</span>
                <span className="text-primary hover:underline cursor-pointer">{user.website}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              Joined {user.joinedDate}
            </div>
          </div>
          <div className="flex gap-5 pb-4">
            <div className="hover:underline cursor-pointer">
              <span className="font-bold text-text-primary">{user.following.toLocaleString()}</span>
              <span className="text-text-muted"> Following</span>
            </div>
            <div className="hover:underline cursor-pointer">
              <span className="font-bold text-text-primary">{user.followers.toLocaleString()}</span>
              <span className="text-text-muted"> Followers</span>
            </div>
            <div className="hover:underline cursor-pointer">
              <span className="font-bold text-text-primary">{user.likes.toLocaleString()}</span>
              <span className="text-text-muted"> Likes</span>
            </div>
            {user.likesToday !== undefined && (
              <div className="hover:underline cursor-pointer">
                <span className="font-bold text-text-primary">{user.likesToday.toLocaleString()}</span>
                <span className="text-text-muted"> Likes today</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs rendered by parent (ProfilePage) */}
      </section>
    </>
  )
}
