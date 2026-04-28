'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

interface SearchUser {
  id: string
  username: string
  displayName: string | null
  name: string
  avatarUrl: string | null
  _count: {
    posts: number
    followers: number
  }
}

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [showResults, setShowResults] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [user, setUser] = useState<{ username: string; displayName: string; avatarUrl: string | null } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch current user on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch('http://localhost:3001/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setUser({ username: data.username, displayName: data.displayName || data.name, avatarUrl: data.avatarUrl }))
      .catch(() => {})
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close dropdown on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close search results on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Debounced search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setSearchLoading(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:3001/users/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setSearchResults(data)
        setShowResults(true)
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const handleResultClick = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  const avatarSrc =
    user?.avatarUrl ||
    (user?.username ? `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}` : '')

  return (
    <header className="fixed top-0 w-full z-50 flex items-center justify-between px-4 h-16 bg-black/80 backdrop-blur-md border-b border-border">
      {/* Left: Logo + Search */}
      <div className="flex items-center gap-4 w-1/4">
        <Link href="/home" className="text-primary text-2xl font-black">
          Nexus
        </Link>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 relative" ref={searchRef}>
          <div className="flex items-center bg-surface-elevated rounded-full px-4 py-2 border border-transparent focus-within:border-primary transition-colors w-full">
            <span className="material-symbols-outlined text-text-muted text-xl">search</span>
            <input
              className="bg-transparent border-none focus:ring-0 text-sm text-text-primary w-full placeholder-text-muted ml-2"
              placeholder="Search Nexus"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowResults(true)}
            />
            {searchLoading && (
              <span className="material-symbols-outlined text-text-muted text-sm animate-spin">progress_activity</span>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated border border-border rounded-xl shadow-xl overflow-hidden z-50">
              {Array.isArray(searchResults) && searchResults.length === 0 && !searchLoading && (
                <div className="px-4 py-3 text-sm text-text-muted">
                  No results found for &ldquo;{searchQuery}&rdquo;
                </div>
              )}
              {Array.isArray(searchResults) && searchResults.map((result) => (
                <Link
                  key={result.id}
                  href={`/profile/${result.username}`}
                  onClick={handleResultClick}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-black/20 transition-colors"
                >
                  <img
                    className="w-10 h-10 rounded-full bg-surface-elevated"
                    src={result.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${result.username}`}
                    alt={result.username}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">
                      {result.displayName || result.name}
                    </p>
                    <p className="text-xs text-text-muted truncate">@{result.username}</p>
                  </div>
                  <div className="text-xs text-text-muted text-right">
                    <p>{result._count.posts} posts</p>
                    <p>{result._count.followers} followers</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center: Nav Tabs */}
      <nav className="flex items-center justify-center gap-8 h-full">
        <Link
          href="/home"
          className={`font-bold border-b-2 pb-3 h-full px-4 flex items-center justify-center transition-colors ${
            pathname === '/home' ? 'text-primary border-primary' : 'text-text-muted border-transparent hover:text-text-primary hover:bg-surface-elevated'
          }`}
        >
          For You
        </Link>
        <Link
          href="/following"
          className={`font-bold border-b-2 pb-3 h-full px-4 flex items-center justify-center transition-colors ${
            pathname === '/following' ? 'text-primary border-primary' : 'text-text-muted border-transparent hover:text-text-primary hover:bg-surface-elevated'
          }`}
        >
          Following
        </Link>
      </nav>

      {/* Right: Notifications + Avatar */}
      <div className="flex items-center justify-end gap-4 w-1/4">
        <button className="p-2 hover:bg-surface-elevated rounded-full transition-colors relative">
          <span className="material-symbols-outlined text-text-primary">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-black" />
        </button>

        {/* Avatar Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-8 h-8 rounded-full overflow-hidden border border-transparent cursor-pointer hover:border-primary transition-colors"
          >
            {avatarSrc && (
              <img className="w-full h-full object-cover" src={avatarSrc} alt="Profile" />
            )}
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-surface-elevated border border-border rounded-xl shadow-xl overflow-hidden z-50">
              <Link
                href={`/profile/${user?.username || ''}`}
                onClick={() => setDropdownOpen(false)}
                className="block px-4 py-3 border-b border-border hover:bg-black/20 transition-colors"
              >
                <p className="text-sm font-bold text-text-primary truncate">
                  {user?.displayName || user?.username || 'User'}
                </p>
                <p className="text-xs text-text-muted truncate">@{user?.username}</p>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-black/20 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
