'use client'

import MainLayout from '@/components/layout/MainLayout'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  bannerUrl: string | null
  bio: string | null
  location: string | null
  website: string | null
}

export default function EditProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')

  // Fetch current user profile on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    fetch('http://localhost:3001/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Not authenticated')
        return r.json()
      })
      .then((data: UserProfile) => {
        setUsername(data.username)
        setDisplayName(data.displayName || '')
        setBio(data.bio || '')
        setLocation(data.location || '')
        setWebsite(data.website || '')
        setAvatarUrl(data.avatarUrl || '')
        setBannerUrl(data.bannerUrl || '')
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const res = await fetch('http://localhost:3001/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName,
          bio,
          location,
          website,
          avatarUrl: avatarUrl || undefined,
          bannerUrl: bannerUrl || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      router.push(`/profile/${username}`)
    } catch {
      setError('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined text-text-muted animate-spin">progress_activity</span>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      {/* Settings Header */}
      <div className="sticky top-16 z-40 bg-black/80 backdrop-blur-md px-4 h-14 flex items-center gap-8 border-b border-border">
        <Link href={`/profile/${username}`} className="hover:bg-surface-elevated p-2 rounded-full transition-colors">
          <span className="material-symbols-outlined text-text-primary">arrow_back</span>
        </Link>
        <h1 className="font-headline-md text-text-primary">Edit Profile</h1>
      </div>

      {/* Profile Banner & Image Upload */}
      <div className="relative">
        <div className="h-48 w-full bg-surface-elevated relative group overflow-hidden">
          {bannerUrl ? (
            <img alt="Profile banner" className="w-full h-full object-cover opacity-60" src={bannerUrl} />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/30 to-secondary/30" />
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" className="bg-black/50 p-3 rounded-full text-white hover:bg-black/70">
              <span className="material-symbols-outlined">add_a_photo</span>
            </button>
          </div>
        </div>
        <div className="px-4 -mt-16 relative z-10 flex justify-between items-end">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-black bg-black overflow-hidden">
              {avatarUrl ? (
                <img alt="Profile picture" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" src={avatarUrl} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-text-muted">
                  {displayName?.[0]?.toUpperCase() || username?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="material-symbols-outlined text-white">camera_enhance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="p-6 space-y-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-label-caps text-text-muted px-1">Display Name</label>
          <div className="relative">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-surface-elevated border border-transparent focus:border-primary focus:ring-0 rounded-lg p-4 text-text-primary transition-all placeholder-text-muted"
              maxLength={50}
              placeholder="Your display name"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-body-sm">{displayName.length} / 50</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-label-caps text-text-muted px-1">Bio</label>
          <div className="relative">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-surface-elevated border border-transparent focus:border-primary focus:ring-0 rounded-lg p-4 text-text-primary transition-all resize-none placeholder-text-muted"
              rows={3}
              maxLength={160}
              placeholder="Tell us about yourself"
            />
            <span className="absolute right-4 bottom-4 text-text-muted text-body-sm">{bio.length} / 160</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-label-caps text-text-muted px-1">Location</label>
          <div className="relative">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-surface-elevated border border-transparent focus:border-primary focus:ring-0 rounded-lg p-4 text-text-primary transition-all placeholder-text-muted"
              placeholder="Add your location"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-label-caps text-text-muted px-1">Website</label>
          <div className="relative">
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full bg-surface-elevated border border-transparent focus:border-primary focus:ring-0 rounded-lg p-4 text-text-primary transition-all placeholder-text-muted"
              placeholder="https://yourwebsite.com"
            />
          </div>
        </div>

        <div className="pt-8 flex gap-4">
          <Link
            href={`/profile/${username}`}
            className="flex-1 py-3 px-6 rounded-full border border-border text-text-primary font-bold hover:bg-surface-elevated transition-colors text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 px-6 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

      <div className="mt-12 p-6 border-t border-border">
        <h3 className="text-label-caps text-text-muted mb-4">Account Management</h3>
        <button className="text-red-500 font-bold text-body-sm hover:underline flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">delete</span>
          Deactivate Account
        </button>
      </div>
    </MainLayout>
  )
}
