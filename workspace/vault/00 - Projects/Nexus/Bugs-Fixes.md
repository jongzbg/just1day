# Bugs & Fixes

## Bug 1: posts.service.ts Encoding Corruption

**Date:** 2026-04-28
**Severity:** Critical

### Problem
`posts.service.ts` was corrupted — file contained garbage/encoded Chinese characters instead of TypeScript code.

### Root Cause
Unknown encoding issue (possibly save with wrong encoding, or file corruption).

### Solution
Rewrote the entire `PostsService` class based on the controller methods and Prisma schema.

### Files Modified
- `server/src/posts/posts.service.ts`

---

## Bug 2: Thread Page — Like/Repost Icon Colors Wrong

**Date:** 2026-04-30
**Severity:** High

### Problem
In `/posts/:id` thread page, like and repost icons showed wrong colors (always gray/unliked) even when user had already liked/reposted.

### Root Cause
`@Get(':id/thread')` endpoint was **missing `@UseGuards(JwtAuthGuard)`**.

Without the guard:
- Request bypassed authentication
- `req.user` was `undefined`
- Service received `currentUserId = undefined`
- Returned `isLiked: false`, `isReposted: false` always

### Solution
Added `@UseGuards(JwtAuthGuard)` to the endpoint:

```typescript
// BEFORE
@Get(':id/thread')
async getThread(@Param('id') id: string, @Request() req) {
  return this.postsService.getThread(id, req.user?.id);
}

// AFTER
@UseGuards(JwtAuthGuard)
@Get(':id/thread')
async getThread(@Param('id') id: string, @Request() req) {
  return this.postsService.getThread(id, req.user.id);
}
```

### Files Modified
- `server/src/posts/posts.controller.ts`

### Lesson Learned
**Always add `@UseGuards(JwtAuthGuard)` when:**
- Endpoint returns user-specific data
- Response depends on `req.user.id`
- Compare with similar endpoints that work correctly

---

## Bug 3: Undo Repost Still Shows Post in Tab

**Date:** 2026-04-30
**Severity:** Medium

### Problem
When user "undo repost", the post was still visible in the "Posts" tab of their profile.

### Root Cause
After calling `unrepost()` API, the frontend only updated `isReposted` flag but didn't filter out the post from the list.

### Solution
Added filter logic after syncing with server response:

```typescript
setFn((prev) => {
  const synced = prev.map((p) =>
    p.id === postId
      ? { ...p, isReposted: res.data.isReposted, repostsCount: res.data.repostsCount }
      : p
  )
  // Remove from Tab Posts if isReposted is now false
  return activeTab === 'posts'
    ? synced.filter((p) => !(p.id === postId && !p.isReposted))
    : synced
})
```

### Files Modified
- `client/src/app/profile/[username]/page.tsx`

---

## Bug 4: Profile Likes Tab — Unlike One Post Removes All

**Date:** 2026-04-30
**Severity:** High

### Problem
On Profile page → Likes tab: clicking unlike on a single post removed the entire list and showed "ยังไม่ได้ like โพสต์ใดเลย".

Also: on Posts tab, clicking unlike on a reposted post made the post disappear.

### Root Cause
1. `handleLike` had `.filter()` that removed posts from **both tabs** on any unlike
2. `setLikes([])` was called before API response → list cleared before server could confirm

### Solution
1. Only filter on Tab Likes (not Posts tab)
2. Filter only **after** server confirms the unlike, not optimistically
3. Remove `setLikes([])` — let sync handle it

```typescript
// BEFORE: filter immediately
setLikes((prev) => update(prev).filter(...))
setLikes([])

// AFTER: filter only after server confirms
if (activeTab === 'posts') {
  setPosts((prev) => update(prev))
} else {
  setLikes((prev) => update(prev))  // just update, no filter
}
// After API response:
if (activeTab === 'posts') {
  setPosts((prev) => sync(prev))
} else {
  setLikes((prev) => sync(prev).filter((p) => !(p.id === postId && !res.data.isLiked)))
}
```

### Files Modified
- `client/src/app/profile/[username]/page.tsx`

---

## Bug 5: Profile Repost — Stale Closure, No Re-render

**Date:** 2026-04-30
**Severity:** Medium

### Problem
Clicking undo repost → icon color and count don't update in real-time. Must refresh page.

### Root Cause
`handleRepost` used `setPosts(sync(posts))` — `posts` captured from closure was the **old value** before optimistic update, so React saw no state change → no re-render.

Same bug affected `handleLike`.

### Solution
Use functional update (`setFn((prev) => ...)`) so the callback always reads the **latest state**:

```typescript
// BEFORE (stale closure)
setPosts(update(posts))
setPosts(sync(posts))  // uses old posts value!

// AFTER (functional update)
setFn(update)  // optimistic
setFn((prev) => sync(prev))  // uses latest prev
```

### Files Modified
- `client/src/app/profile/[username]/page.tsx`

---

## Bug 6: Profile Avatar Click Opens Dropdown Instead of Lightbox

**Date:** 2026-04-30
**Severity:** Low

### Problem
Clicking avatar on any profile page opened an Edit/Logout dropdown. Should only open on own profile; others should show full-size image.

### Root Cause
Avatar was always wrapped in a `<button>` that toggled a dropdown. No `isOwnProfile` check.

### Solution
Conditionally render:
- Own profile → button + dropdown (Edit Profile / Logout)
- Others → plain `<img>` with lightbox modal on click

```tsx
{isOwnProfile ? (
  <button onClick={() => setDropdownOpen(true)}>...</button>
) : (
  <button onClick={() => setAvatarModalOpen(true)}>...</button>
)}
```

Added `avatarModalOpen` state with full-screen modal overlay.

### Files Modified
- `client/src/components/profile/ProfileHeader.tsx`

---

## Bug 7: LeftSidebar Avatar 404 Errors

**Date:** 2026-04-30
**Severity:** Medium

### Problem
Leaderboard cards in LeftSidebar showed broken images (404 errors) for users who had relative or invalid `avatarUrl`.

### Root Cause
`avatarSrc(url, username)` used `url || fallback` — if URL was relative (`/uploads/...`) or invalid, browser tried to load it from wrong origin.

### Solution
Validate that `avatarUrl` is an absolute URL before using it:

```typescript
const avatarSrc = (url: string | null | undefined, username: string) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url
  }
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`
}
```

### Files Modified
- `client/src/components/layout/LeftSidebar.tsx`

---

## Bug 8: Save Profile Fails After Avatar Upload

**Date:** 2026-04-30
**Severity:** High

### Problem
Uploading avatar works, but clicking "Save" on edit-profile page shows "Failed to save profile. Please try again."

### Root Cause
`UpdateProfileDto` had `@IsUrl()` validator on `avatarUrl` and `bannerUrl`. ValidationPipe rejected `localhost` URLs before reaching the service.

### Solution
Changed `@IsUrl()` → `@IsString()` on both fields:

```typescript
@IsOptional()
@IsString()  // was @IsUrl()
avatarUrl?: string;

@IsOptional()
@IsString()  // was @IsUrl()
bannerUrl?: string;
```

### Files Modified
- `server/src/users/dto/users.dto.ts`

---

## Bug 9: Sharp Import Fails — `(0, sharp_1.default) is not a function`

**Date:** 2026-04-30
**Severity:** Critical

### Problem
`POST /upload/avatar` crashes with error `(0, sharp_1.default) is not a function`.

### Root Cause
`import sharp from 'sharp'` uses ESM-style default export, but NestJS project uses CommonJS — incompatible.

### Solution
Use CommonJS require syntax:

```typescript
// WRONG (ESM import)
import sharp from 'sharp'

// CORRECT (CommonJS require)
const sharp = require('sharp')
```

Also required `sharp.clone()` before each resize operation.

### Files Modified
- `server/src/upload/upload.service.ts`
- Install: `npm install sharp`

---

## Bug 10: .env.windows Committed with Secrets

**Date:** 2026-04-28
**Severity:** Critical (Security)

### Problem
`workspace/server/.env.windows` containing `JWT_SECRET` and `DATABASE_URL` was committed to GitHub.

### Solution
1. Removed file from git history
2. Added `*.windows` to `.gitignore`
3. Created commit to remove from remote

### Prevention
Always check `.gitignore` before committing. Sensitive files should never be tracked.

---

## Common Patterns for Bug Fixes

### 1. Guard Pattern
```typescript
// ALWAYS use guard when accessing req.user
@UseGuards(JwtAuthGuard)
@Get(':id')
async getSomething(@Request() req) {
  // req.user is guaranteed to exist
}
```

### 2. Optimistic Update + Functional Update Pattern
```typescript
// 1. Optimistic update
setFn(update)
// 2. Call API
const res = await api.toggleLike(postId)
// 3. Functional sync — avoids stale closure
setFn((prev) => sync(prev))
```

### 3. Filter After Confirm Pattern
```typescript
// Filter from list only AFTER server confirms the action
if (activeTab === 'posts') {
  // Don't filter — just sync
  setPosts((prev) => sync(prev))
} else {
  // Filter only after server confirms
  setLikes((prev) => sync(prev).filter((p) => !(p.id === postId && !res.data.isLiked)))
}
```

### 4. Sharp Usage Pattern
```typescript
const sharp = require('sharp')  // NOT import
await image.clone().resize(...).webp(...).toFile(path)
```

### 5. DTO Validation Pattern
```typescript
// For URL fields that might be localhost/relative
@IsOptional()
@IsString()  // Don't use @IsUrl() for user-provided URLs
avatarUrl?: string
```

---

## Bug 11: Notification Bell Showing MESSAGE Notifications

**Date:** 2026-05-01
**Severity:** Medium

### Problem
Notification bell (🔔) showed MESSAGE notifications even though we have a separate message icon (✉️) for message notifications.

### Root Cause
`getNotifications` and `getUnreadCount` didn't filter out `MESSAGE` type notifications.

### Solution
Added `type: { not: 'MESSAGE' }` filter to all notification queries:

```typescript
// getNotifications
where: { userId, type: { not: 'MESSAGE' }, ... }

// getUnreadCount
where: { userId, isRead: false, type: { not: 'MESSAGE' } }

// markAsRead (mark all)
where: { userId, isRead: false, type: { not: 'MESSAGE' } }
```

### Files Modified
- `server/src/notifications/notifications.service.ts`

---

## Bug 12: Clicking One Notification Clears All Badge Count

**Date:** 2026-05-01
**Severity:** Medium

### Problem
Clicking a single notification in the dropdown set the badge count to 0 instantly (should only decrement by 1).

### Root Cause
`handleNotificationClick` called `onMarkAsRead()` which set count to 0. But `onMarkAsRead` was the same callback used for "Mark all as read" button.

### Solution
Split the callback into two:
- `onMarkAllAsRead()` → sets count to 0
- `onMarkOneAsRead()` → decrements count by 1

```typescript
// NotificationDropdown
interface NotificationDropdownProps {
  onClose: () => void
  onMarkAllAsRead: () => void   // set to 0
  onMarkOneAsRead: () => void    // decrement by 1
}

// Header usage
<NotificationDropdown
  onMarkAllAsRead={markAsRead}           // sets to 0
  onMarkOneAsRead={decrementUnreadCount} // -1
/>
```

### Files Modified
- `client/src/hooks/useNotifications.ts` (added `decrementUnreadCount`)
- `client/src/components/NotificationDropdown.tsx`
- `client/src/components/layout/Header.tsx`

---

## Bug 13: Profile likesCount & likesTodayCount Not Updating

**Date:** 2026-05-01
**Severity:** Medium

### Problem
When liking/unliking a post on profile page, the profile header stats (`Likes`, `Likes today`) didn't update until page refresh.

### Root Cause
1. `likesCount` only decremented on unlike, never incremented on like
2. `likesTodayCount` was never updated at all

### Solution
Updated profile sync logic after like action:

```typescript
setProfile((prev) => {
  if (!prev) return prev
  const postInPosts = posts.find((p) => p.id === postId)
  const isOwnPost = postInPosts?.user.id === prev.id
  if (!isOwnPost) return prev

  // Check if post was created today for likesTodayCount
  const isToday = postInPosts && new Date(postInPosts.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)

  if (res.data.isLiked) {
    return {
      ...prev,
      likesCount: prev.likesCount + 1,
      likesTodayCount: isToday ? prev.likesTodayCount + 1 : prev.likesTodayCount,
    }
  } else {
    return {
      ...prev,
      likesCount: Math.max(0, prev.likesCount - 1),
      likesTodayCount: isToday ? Math.max(0, prev.likesTodayCount - 1) : prev.likesTodayCount,
    }
  }
})
```

### Files Modified
- `client/src/app/profile/[username]/page.tsx`

---

## Bug 14: Repost of Deleted Post Still Showing

**Date:** 2026-05-01
**Severity:** Medium

### Problem
Reposts of soft-deleted posts still appeared in user's Posts tab.

### Root Cause
`getUserPosts` fetched reposts without checking if the original post was soft-deleted (`deletedAt` not null).

### Solution
Added filter for deleted original posts:

```typescript
// Reposts query
this.prisma.repost.findMany({
  where: {
    userId: user.id,
    createdAt: { gte: yesterday },
    post: { deletedAt: null, createdAt: { gte: yesterday } }  // filter deleted + old posts
  },
  // ...
})
```

### Files Modified
- `server/src/posts/posts.service.ts`

---

## Bug 15: LeftSidebar Avatar 404 - Wrong URL Replacement

**Date:** 2026-05-01
**Severity:** Medium

### Problem
LeftSidebar shows broken images (404) for users in "Total likes" and "Today's likes" cards, even though their profile page shows the correct avatar.

### Root Cause
`avatarSrc()` function incorrectly replaced backend URL (`http://localhost:3001`) with frontend URL (`http://localhost:3000`):

```typescript
// WRONG - Frontend (:3000) doesn't serve files!
if (url.startsWith(backendHost)) {
  return url.replace(backendHost, window.location.origin);  // → http://localhost:3000/uploads/...
}
```

### Solution
Keep backend URLs as-is. For relative URLs, prepend `API_BASE_URL`:

```typescript
// CORRECT - Keep backend URLs, prepend API_BASE_URL for relative paths
if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
  return url;  // Keep backend URLs as-is
}
if (url && url.startsWith('/')) {
  return `${API_BASE_URL}${url}`;  // → http://localhost:3001/uploads/...
}
```

### Files Modified
- `client/src/components/layout/LeftSidebar.tsx`

### Key Insight
**Frontend (Next.js :3000) does NOT serve static files** - only the **Backend (NestJS :3001)** serves `/uploads/*`. Always prepend `API_BASE_URL` for relative paths, don't replace the backend origin.

---

## Bug 16: PostCard — Click on Image Goes to Profile Instead of Thread

**Date:** 2026-05-04
**Severity:** High

### Problem
Clicking on an image in a post went to the author's profile instead of the thread.

### Root Cause
1. `<Link>` wrapper on avatar was matching click events from image area
2. Image container didn't have `stopPropagation()` to prevent bubble-up

### Solution
1. Added `stopPropagation()` to avatar and header links
2. Wrapped images with Link to `/posts/:id`
3. Added `w-10 h-10 shrink-0` to avatar Link to prevent it from stretching

```tsx
// Avatar Link - stop bubble + size constraint
<Link
  href={`/profile/${post.user.username}`}
  className="shrink-0 w-10 h-10"
  onClick={(e) => e.stopPropagation()}
>
  <img ... />
</Link>

// Image Link - go to thread
<Link href={`/posts/${post.id}`} onClick={(e) => e.stopPropagation()}>
  <img ... />
</Link>
```

### Files Modified
- `client/src/components/posts/PostCard.tsx`

---

## Bug 17: parseContent — Missing @mention & External URL Detection

**Date:** 2026-05-04
**Severity:** Medium

### Problem
@mentions were not clickable links to profile, and external URLs were not opening in browser.

### Root Cause
`parseContent()` only detected `#hashtags`, not `@mentions` or URLs.

### Solution
Updated regex pattern to match all three:

```tsx
function parseContent(content: string): React.ReactNode[] {
  const parts = content.split(/(@[\wก-๙]+)|(#[฀-๿\w]+)|(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) => {
    if (!part) return part

    // @mention
    if (part.startsWith('@')) {
      const username = part.slice(1)
      return (
        <Link href={`/profile/${username}`} onClick={(e) => e.stopPropagation()}>
          {part}
        </Link>
      )
    }

    // #hashtag
    if (part.startsWith('#')) {
      const tag = part.slice(1)
      return (
        <Link href={`/hashtag/${tag}`} onClick={(e) => e.stopPropagation()}>
          {part}
        </Link>
      )
    }

    // External URL
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a href={part} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          {part}
        </a>
      )
    }

    return part
  })
}
```

### Files Modified
- `client/src/components/posts/PostCard.tsx`

---

## Bug 18: Single Image — Lightbox Navigation Arrows Showing

**Date:** 2026-05-04
**Severity:** Low

### Problem
Single image posts showed left/right navigation arrows in lightbox, which are unnecessary for 1 image.

### Root Cause
Lightbox default behavior shows navigation arrows regardless of slide count.

### Solution
Use `render.buttonPrev` and `render.buttonNext` props to conditionally hide arrows:

```tsx
<Lightbox
  open
  close={closeLightbox}
  slides={mediaImages.map((src) => ({ src }))}
  index={lightboxIndex}
  render={{
    buttonPrev: mediaImages.length > 1 ? undefined : () => null,
    buttonNext: mediaImages.length > 1 ? undefined : () => null,
  }}
/>
```

### Files Modified
- `client/src/components/posts/PostCard.tsx`

---

## Bug 19: Thread Page — Icons Layout Different from Home

**Date:** 2026-05-04
**Severity:** Medium

### Problem
Icons (comment, repost, like) on Thread page looked different from Home/Profile pages.

### Root Cause
Thread page used inline button rendering instead of `<PostCard>` component.

### Solution
Replaced inline article rendering with `<PostCard>` component:

```tsx
// BEFORE - inline rendering with different CSS
<article className="p-4 border-b border-border">
  <div className="flex items-center gap-2 ...">
    <button>chat_bubble</button>
    <button>repeat</button>
    <button>favorite</button>
  </div>
</article>

// AFTER - use shared PostCard component
<PostCard
  post={mapPost(post)}
  rawPost={thread.post}
  onLike={handleLike}
  onRepost={handleRepost}
  onQuote={handleQuote}
  onComment={setCommentPost}
  currentUsername={currentUsername || undefined}
  onClick={(e) => e.preventDefault()}
/>
```

### Files Modified
- `client/src/app/posts/[id]/page.tsx`
- Removed inline action buttons → now uses PostCard → PostActions

---

## Bug 20: Thread Page — Avatar Wrong in CommentModal

**Date:** 2026-05-04
**Severity:** Medium

### Problem
When clicking comment icon on Thread page, the CommentModal showed wrong avatar for the current user.

### Root Cause
`currentUser` object in Thread page didn't include `avatarUrl` from `authApi.me()`.

### Solution
Added `currentUserAvatar` state and pass it to CommentModal:

```tsx
// State
const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null)

// Fetch
authApi.me().then((res) => {
  setCurrentUsername(res.data.username)
  setCurrentUserAvatar(res.data.avatarUrl || null)
})

// Pass to CommentModal
<CommentModal
  currentUser={{
    id: currentUserId,
    username: currentUsername || '',
    displayName: currentUsername || '',
    avatarUrl: currentUserAvatar,  // Use real avatar
  }}
/>
```

### Files Modified
- `client/src/app/posts/[id]/page.tsx`

---

## Bug 21: Thread Page — Reply Input Avatar Wrong

**Date:** 2026-05-04
**Severity:** Low

### Problem
Reply input at bottom of Thread page ("Reply to @username...") showed wrong avatar.

### Root Cause
Used hardcoded dicebear fallback instead of user's actual avatar URL.

### Solution
Use `currentUserAvatar` with dicebear fallback:

```tsx
// BEFORE
<img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${currentUsername}`} ... />

// AFTER
<img src={currentUserAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${currentUsername}`} ... />
```

### Files Modified
- `client/src/app/posts/[id]/page.tsx`

---

## Bug 22: PostActions — Icons Too Close to Edge

**Date:** 2026-05-04
**Severity:** Low

### Problem
Icons in PostActions were too close to the left/right edges on Thread page.

### Root Cause
PostActions container had no horizontal padding.

### Solution
Added `px-4` to PostActions container:

```tsx
<div className="flex items-center justify-between mt-3 px-4 text-text-muted relative">
  ...
</div>
```

### Files Modified
- `client/src/components/posts/PostActions.tsx`

---

## Bug 23: Like/Repost Creates Duplicate Notifications

**Date:** 2026-05-04
**Severity:** High

### Problem
Rapidly clicking like/unlike on the same post created multiple notification entries for the same action.

### Root Cause
Backend didn't check for existing notification before creating, and didn't delete notification when unliking.

### Solution
1. Check for existing notification before creating
2. Delete notification when unliking/unreposting

```typescript
// toggleLike - unlike
if (existing) {
  await this.prisma.like.deleteMany({ where: { userId, postId } });
  // DELETE notification on unlike
  await this.prisma.notification.deleteMany({
    where: { type: 'LIKE', actorId: userId, postId },
  });
  return ...
}

// toggleLike - like
// Check existing before creating
const existingNotif = await this.prisma.notification.findFirst({
  where: { type: 'LIKE', actorId: userId, postId },
});
if (!existingNotif) {
  await this.prisma.notification.create({
    data: { type: 'LIKE', userId: post.userId, actorId: userId, postId },
  });
}

// repost - same pattern
const existingNotif = await this.prisma.notification.findFirst({
  where: { type: 'REPOST', actorId: userId, postId },
});
if (!existingNotif) {
  await this.prisma.notification.create({ ... });
}

// unrepost - delete notification
await this.prisma.notification.deleteMany({
  where: { type: 'REPOST', actorId: userId, postId },
});
```

### Files Modified
- `server/src/posts/posts.service.ts`

---

## Common Patterns for Bug Fixes (Updated)

### 1. Avatar Link Size Constraint Pattern
```tsx
// Always add w/h to Link wrapper to prevent stretching
<Link href="..." className="shrink-0 w-10 h-10">
  <img ... />
</Link>
```

### 2. Stop Propagation Pattern
```tsx
// Links inside clickable containers need stopPropagation
<article onClick={handleClick}>
  <Link onClick={(e) => e.stopPropagation()} href="...">
    ...
  </Link>
</article>
```

### 3. Shared Component Pattern
```tsx
// Instead of duplicating UI, use shared component
// Thread page → <PostCard> (same as Home/Profile)
// This ensures consistent icons, actions, behavior
```

### 4. Notification Deduplication Pattern
```typescript
// Before creating notification
const existing = await prisma.notification.findFirst({
  where: { type, actorId, postId },
});
if (!existing) {
  await prisma.notification.create({ data: { type, actorId, postId, userId } });
}

// Before deleting, also delete notification
await prisma.notification.deleteMany({
  where: { type, actorId, postId },
});
```

### 5. Functional Update Pattern for Stale State
```tsx
// Use functional updates to avoid stale closure
setFn((prev) => newValue)  // NOT setFn(value)
// React guarantees prev is always the latest state
```

### 6. Fragment Wrapper for JSX Siblings
```tsx
// If return has multiple root elements, wrap in fragment
return (
  <>
    <article>...</article>
    <Lightbox ... />
  </>
)
```
