---
name: nexus-video-upload
description: Key fixes and patterns for Nexus video upload pipeline
---

# Nexus Video Upload — Key Fixes

## Duration lost during poll cycle

**Problem:** When polling video status (`GET /api/posts/:id`), the API response sometimes has `duration: null`. This overwrites the existing `videoData.duration` state, causing the time display to show `0:00`.

**Fix:** Preserve duration from previous state when API doesn't return it.

```tsx
const updated = { ...res.data }
if (updated.duration == null && videoData?.duration) {
  updated.duration = videoData.duration
}
setVideoData(updated)
```

Apply this same pattern to any other nullable fields that should persist across poll cycles.

---

## Pending/processing video controls

VideoPlayer shows controls for pending/processing videos but they are disabled (greyed out, non-interactive). Controls include: progress bar, play/pause, current time, volume, fullscreen.

**Pattern:** Use a `isDisabled` prop or `isPending` state to apply `pointer-events: none` and low opacity to control elements.

---

## Video upload phases (complete)

- Phase 3.1: Client-side video preview (before submit)
- Phase 3.2: Server upload with FFmpeg + HLS + progress tracking
- Phase 3.3: PostCard video player — poll status, click-to-play, duration badge, disabled controls during processing