'use client'

import { useState } from 'react'
import { postApi } from '@/lib/api'

interface PostComposerProps {
  onPostCreated?: () => void
}

export default function PostComposer({ onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePost = async () => {
    if (!content.trim()) return

    setLoading(true)
    try {
      await postApi.createPost(content.trim())
      setContent('')
      onPostCreated?.()
    } catch (err) {
      console.error('Failed to create post:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border-b border-border flex gap-4">
      <img
        alt="Me"
        className="w-10 h-10 rounded-full shrink-0"
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuByXvU8QSuhgigTfXi5wTpJQAkBr8vXolX3VfLpqESxglE5uM7SCu1CT0TqFLUpGqjfclKlpLpOBETfYn3xPYRFS7FMpQ7TrumPaQ6aHkO3yCY_rYrnXeG2UNUNFMaeZF3rlWx8ppHyp8bhes7NozIJW2WOpy5rAWTzr7lcdeknsw3MDwrvdj1ICrdqFau_m7smt8rN7woXZ5AJ33_KxUKwXaWfdrvKxgk4sm9nX5kCNnFb24aMISQejHBo8E97bm3zldbfLK9NpPc"
      />
      <div className="flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-transparent border-none focus:ring-0 text-xl text-text-primary placeholder-text-muted resize-none h-24"
          placeholder="What is happening?!"
        />
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-primary">
            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
              <span className="material-symbols-outlined text-xl">image</span>
            </button>
            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
              <span className="material-symbols-outlined text-xl">gif_box</span>
            </button>
            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
              <span className="material-symbols-outlined text-xl">poll</span>
            </button>
            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
              <span className="material-symbols-outlined text-xl">sentiment_satisfied</span>
            </button>
            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
              <span className="material-symbols-outlined text-xl">calendar_month</span>
            </button>
          </div>
          <button
            onClick={handlePost}
            disabled={!content.trim() || loading}
            className="bg-primary text-white font-bold px-5 py-2 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'กำลังโพสต์...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
