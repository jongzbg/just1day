'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { API_BASE_URL } from '@/lib/api'

interface TopCreator {
  username: string
  displayName: string | null
  avatarUrl: string | null
  _count: { followers: number; posts: number }
}

export default function LeftSidebar() {
  const [creators, setCreators] = useState<TopCreator[]>([])

  useEffect(() => {
    fetch(`${API_BASE_URL}/users/top/creators`)
      .then(r => r.json())
      .then(data => setCreators(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => setCreators([]))
  }, [])

  return (
    <aside className="hidden lg:flex flex-col w-64 fixed left-[calc(50%-650px)] top-16 h-[calc(100vh-64px)] p-4 space-y-6 overflow-y-auto custom-scrollbar">
      {/* Top Creators Card */}
      <div className="bg-surface-elevated rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-headline-md text-text-primary">Top Creators</h2>
        </div>
        <div className="flex flex-col">
          {creators.length === 0 && (
            <p className="p-4 text-sm text-text-muted">Loading...</p>
          )}
          {creators.map((creator) => (
            <Link
              key={creator.username}
              href={`/profile/${creator.username}`}
              className="p-4 flex items-center gap-3 hover:bg-border cursor-pointer transition-colors"
            >
              <img
                alt={creator.displayName || creator.username}
                className="w-10 h-10 rounded-full bg-surface-base"
                src={creator.avatarUrl || '/default-avatar.png'}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{creator.displayName || creator.username}</p>
                <p className="text-xs text-text-muted truncate">@{creator.username}</p>
              </div>
              <button className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#e6e6e6] transition-colors">
                Follow
              </button>
            </Link>
          ))}
        </div>
        <button className="w-full p-4 text-primary text-sm font-medium hover:bg-border text-left transition-colors">
          Show more
        </button>
      </div>

      {/* Footer Links */}
      <div className="p-4 text-xs text-text-muted space-y-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <a className="hover:underline" href="#">Terms of Service</a>
          <a className="hover:underline" href="#">Privacy Policy</a>
          <a className="hover:underline" href="#">Cookie Policy</a>
          <a className="hover:underline" href="#">Accessibility</a>
        </div>
        <p>© 2024 Nexus Social Inc.</p>
      </div>
    </aside>
  )
}