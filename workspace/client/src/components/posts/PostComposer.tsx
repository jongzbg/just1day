'use client'

import { useState, useRef } from 'react'
import { postApi, uploadApi } from '@/lib/api'

interface PostComposerProps {
  onPostCreated?: () => void
  avatarUrl?: string | null
  username?: string
}

export default function PostComposer({ onPostCreated, avatarUrl, username }: PostComposerProps) {
  const [content, setContent] = useState('')
  const [mediaFiles, setMediaFiles] = useState<{ url: string; preview: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const avatar =
    avatarUrl || (username ? `https://api.dicebear.com/7.x/identicon/svg?seed=${username}` : '')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null) // clear previous error
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Prevent selecting more than 4 total
    const MAX_MEDIA = 4
    if (mediaFiles.length + files.length > MAX_MEDIA) {
      setUploadError(`โปรดเลือกรูปภาพ วิดีโอ สูงสุด ${MAX_MEDIA} รายการ`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    const uploaded: { url: string; preview: string }[] = []

    try {
      for (const file of files) {
        const preview = URL.createObjectURL(file)
        const res = await uploadApi.uploadImage(file)
        uploaded.push({ url: res.data.url, preview })
      }
      setMediaFiles((prev) => [...prev, ...uploaded].slice(0, 4)) // max 4 images
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 413) {
        setUploadError('ไฟล์มีขนาดใหญ่เกิน 10MB กรุณาเลือกไฟล์ที่เล็กกว่า')
      } else {
        setUploadError('อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่')
      }
      console.error('Failed to upload image:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const next = [...prev]
      URL.revokeObjectURL(next[index].preview)
      next.splice(index, 1)
      return next
    })
  }

  const handlePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) return

    setLoading(true)
    try {
      const mediaUrls = mediaFiles.map((m) => m.url)
      await postApi.createPost(content.trim(), mediaUrls)
      setContent('')
      mediaFiles.forEach((m) => URL.revokeObjectURL(m.preview))
      setMediaFiles([])
      onPostCreated?.()
      window.dispatchEvent(new CustomEvent('nexus:post-created'))
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
        src={avatar}
      />
      <div className="flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-transparent border-none focus:ring-0 text-xl text-text-primary placeholder-text-muted resize-none h-24"
          placeholder="What is happening?!"
        />

        {/* Media preview */}
        {mediaFiles.length > 0 && (
          <>
            {/* 3-image special layout: 1 large left + 2 stacked right */}
            {mediaFiles.length === 3 ? (
              <div className="flex gap-2 mt-2 h-64">
                {/* Left: big image */}
                <div className="relative flex-1 rounded-xl overflow-hidden bg-surface-base border border-border min-w-0">
                  {mediaFiles[0].url.match(/\.(mp4|webm|mov)$/i) ? (
                    <video src={mediaFiles[0].preview} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={mediaFiles[0].preview} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(0)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-black rounded-full flex items-center justify-center text-white text-xs font-bold transition-colors"
                  >
                    ✕
                  </button>
                </div>
                {/* Right: 2 stacked */}
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  {[1, 2].map((i) => (
                    <div key={i} className="relative flex-1 rounded-xl overflow-hidden bg-surface-base border border-border min-h-0">
                      {mediaFiles[i].url.match(/\.(mp4|webm|mov)$/i) ? (
                        <video src={mediaFiles[i].preview} controls className="w-full h-full object-cover" />
                      ) : (
                        <img src={mediaFiles[i].preview} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-black rounded-full flex items-center justify-center text-white text-xs font-bold transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`grid gap-2 mt-2 ${
            mediaFiles.length === 1 ? 'grid-cols-1' :
            mediaFiles.length === 2 ? 'grid-cols-2' :
            mediaFiles.length >= 3 ? 'grid-cols-2' : ''
          }`}>
            {mediaFiles.map((media, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden bg-surface-base border border-border">
                {media.url.match(/\.(mp4|webm|mov)$/i) ? (
                  <video src={media.preview} controls className="w-full object-cover max-h-64" />
                ) : (
                  <img src={media.preview} alt="" className="w-full object-cover max-h-64" />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-black rounded-full flex items-center justify-center text-white text-xs font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
              </div>
            )}
          </>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {uploadError}
          </div>
        )}

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-primary">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 hover:bg-primary/10 rounded-full transition-colors disabled:opacity-50"
              title="Add image or video"
            >
              {uploading ? (
                <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-xl">image</span>
              )}
            </button>
            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors" title="GIF">
              <span className="material-symbols-outlined text-xl">gif_box</span>
            </button>
            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors" title="Poll">
              <span className="material-symbols-outlined text-xl">poll</span>
            </button>
            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors" title="Emoji">
              <span className="material-symbols-outlined text-xl">sentiment_satisfied</span>
            </button>
            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors" title="Schedule">
              <span className="material-symbols-outlined text-xl">calendar_month</span>
            </button>
          </div>
          <button
            onClick={handlePost}
            disabled={(!content.trim() && mediaFiles.length === 0) || loading}
            className="bg-primary text-white font-bold px-5 py-2 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'กำลังโพสต์...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
