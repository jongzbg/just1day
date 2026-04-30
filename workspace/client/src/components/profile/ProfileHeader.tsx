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
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

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
          <div>
            {/* Click avatar to open full-size image */}
            <button
              onClick={() => setAvatarModalOpen(true)}
              className="p-1 bg-black rounded-full hover:ring-2 hover:ring-primary transition-all cursor-pointer"
            >
              <img
                alt="Profile avatar"
                className="w-32 h-32 rounded-full object-cover border-4 border-black"
                src={user.avatar}
              />
            </button>
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

      {/* Avatar full-size modal */}
      {avatarModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setAvatarModalOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-light cursor-pointer"
            onClick={() => setAvatarModalOpen(false)}
          >
            ✕
          </button>
          <img
            alt="Profile avatar"
            className="max-w-full max-h-full rounded-2xl object-contain"
            src={user.avatar}
          />
        </div>
      )}
    </>
  )
}
