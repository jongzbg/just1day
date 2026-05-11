---
name: nexus-bugs-fixes
description: All bugs and fixes for Nexus Social — Next.js + NestJS. 17 bugs documented with root cause and solution. Always load when debugging Nexus.
tags: [nexus, bug, fix, debugging, nextjs, nestjs]
triggers:
  - "bug"
  - "error"
  - "แก้บัก"
  - "ไม่ทำงาน"
  - "wrong"
  - "incorrect"
  - "fails"
  - "repost banner"
  - "You reposted"
created: 2026-05-05
---

# Nexus Social — Bugs & Fixes

## Bug 1: posts.service.ts Encoding Corruption
**Date:** 2026-04-28 | **Severity:** Critical

### Problem
File contained garbage/encoded Chinese characters instead of TypeScript code.

### Solution
Rewrote the entire `PostsService` class based on the controller methods and Prisma schema.

**⚠️ NEVER convert file encoding** — use only `patch` tool.

---

## Bug 2: Thread Page — Like/Repost Icon Colors Wrong
**Date:** 2026-04-30 | **Severity:** High

### Problem
In `/posts/:id` thread page, like and repost icons always showed gray/unliked.

### Root Cause
`@Get(':id/thread')` endpoint was **missing `@UseGuards(JwtAuthGuard)`**.
Without the guard: `req.user` was `undefined` → returned `isLiked: false`, `isReposted: false` always.

### Solution
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

**Lesson:** Always add `@UseGuards(JwtAuthGuard)` when endpoint returns user-specific data.

---

## Bug 3: Undo Repost Still Shows Post in Tab
**Date:** 2026-04-30 | **Severity:** Medium

### Problem
When user "undo repost", the post was still visible in the "Posts" tab.

### Root Cause
Frontend only updated `isReposted` flag but didn't filter out the post from the list.

### Solution
Filter after syncing with server response:
```typescript
setFn((prev) => {
  const synced = prev.map((p) =>
    p.id === postId
      ? { ...p, isReposted: res.data.isReposted, repostsCount: res.data.repostsCount }
      : p
  )
  return activeTab === 'posts'
    ? synced.filter((p) => !(p.id === postId && !p.isReposted))
    : synced
})
```

---

## Bug 4: Profile Likes Tab — Unlike One Post Removes All
**Date:** 2026-04-30 | **Severity:** High

### Problem
Clicking unlike on a single post removed the entire list.

### Root Cause
`handleLike` had `.filter()` that removed posts from **both tabs** on any unlike. `setLikes([])` was called before API response.

### Solution
1. Only filter on Tab Likes (not Posts tab)
2. Filter only **after** server confirms the unlike, not optimistically
3. Remove `setLikes([])`

---

## Bug 5: Profile Repost — Stale Closure, No Re-render
**Date:** 2026-04-30 | **Severity:** Medium

### Problem
Clicking undo repost → icon and count don't update. Must refresh page.

### Root Cause
`handleRepost` used `setPosts(sync(posts))` — `posts` captured from closure was the **old value** before optimistic update.

### Solution
Use functional update (`setFn((prev) => ...)`):
```typescript
// WRONG
setPosts(update(posts))
setPosts(sync(posts))  // stale!

// CORRECT
setFn((prev) => update(prev))
setFn((prev) => sync(prev))  // reads latest state
```

---

## Bug 6: Profile Avatar Click Opens Dropdown Instead of Lightbox
**Date:** 2026-04-30 | **Severity:** Low

### Problem
Clicking avatar on any profile page opened Edit/Logout dropdown. Should only open on own profile.

### Solution
Conditionally render based on `isOwnProfile`:
```tsx
{isOwnProfile ? (
  <button onClick={() => setDropdownOpen(true)}>...</button>
) : (
  <button onClick={() => setAvatarModalOpen(true)}>...</button>
)}
```

---

## Bug 7: LeftSidebar Avatar 404 Errors
**Date:** 2026-04-30 | **Severity:** Medium

### Problem
Leaderboard cards showed broken images for users with relative or invalid `avatarUrl`.

### Solution
Validate absolute URL:
```typescript
if (url && (url.startsWith('http://') || url.startsWith('https://'))) return url
return `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`
```

---

## Bug 8: Save Profile Fails After Avatar Upload
**Date:** 2026-04-30 | **Severity:** High

### Problem
Uploading avatar works, but "Save" shows error.

### Root Cause
`UpdateProfileDto` had `@IsUrl()` validator — rejected `localhost` URLs.

### Solution
Change to `@IsString()`:
```typescript
@IsOptional()
@IsString()  // was @IsUrl()
avatarUrl?: string;
```

---

## Bug 9: Sharp Import Fails
**Date:** 2026-04-30 | **Severity:** Critical

### Problem
`POST /upload/avatar` crashes: `(0, sharp_1.default) is not a function`.

### Root Cause
`import sharp from 'sharp'` is ESM-style but NestJS uses CommonJS.

### Solution
```typescript
// WRONG
import sharp from 'sharp'

// CORRECT
const sharp = require('sharp')
```
Also required `sharp.clone()` before each resize.

---

## Bug 10: .env.windows Committed with Secrets
**Date:** 2026-04-28 | **Severity:** Critical (Security)

### Solution
1. Removed file from git history
2. Added `*.windows` to `.gitignore`

---

## Bug 11: Notification Bell Showing MESSAGE Notifications
**Date:** 2026-05-01 | **Severity:** Medium

### Problem
Notification bell showed MESSAGE notifications even though there's a separate message icon.

### Solution
Add `type: { not: 'MESSAGE' }` filter:
```typescript
// getNotifications
where: { userId, type: { not: 'MESSAGE' }, ... }

// getUnreadCount
where: { userId, isRead: false, type: { not: 'MESSAGE' } }
```

---

## Bug 12: Clicking One Notification Clears All Badge Count
**Date:** 2026-05-01 | **Severity:** Medium

### Problem
Clicking a single notification set badge count to 0 instantly (should decrement by 1).

### Solution
Split callback into two:
- `onMarkAllAsRead()` → sets count to 0
- `onMarkOneAsRead()` → decrements by 1

---

## Bug 13: Profile likesCount & likesTodayCount Not Updating
**Date:** 2026-05-01 | **Severity:** Medium

### Problem
When liking/unliking, profile header stats didn't update until page refresh.

### Solution
Update profile after like action with both increment and decrement:
```typescript
setProfile((prev) => {
  if (res.data.isLiked) {
    return { ...prev, likesCount: prev.likesCount + 1, ... }
  } else {
    return { ...prev, likesCount: Math.max(0, prev.likesCount - 1), ... }
  }
})
```

---

## Bug 14: Repost of Deleted Post Still Showing
**Date:** 2026-05-01 | **Severity:** Medium

### Solution
Add filter for deleted original posts:
```typescript
post: { deletedAt: null, createdAt: { gte: yesterday } }
```

---

## Bug 15: FAB Panel — "2 Topics" When Opening
**Date:** 2026-05-05 | **Severity:** Medium

### Problem
Both FAB button and panel were visible simultaneously.

### Solution
FAB button only shows when `panelState === 'closed'`:
```tsx
{panelState === 'closed' && <FAB button />}
{panelState !== 'closed' && <Panel />}
```
Panel positioned at same position as FAB button (not bottom-24 + bottom-6).

---

## Bug 16: Image Upload — 413 Error Without User Feedback
**Date:** 2026-05-05 | **Severity:** Medium

### Problem
When a file > 10MB is uploaded, server returns 413 but frontend only logs to console — no user notification.

### Root Cause
`catch` block in `PostComposer.tsx` only called `console.error()`, same in `edit-profile/page.tsx`.

### Solution
1. `PostComposer.tsx`: detect 413 from `err?.response?.status`, set `uploadError` state with message
2. `edit-profile/page.tsx`: check `res.status === 413`, throw `FILE_TOO_LARGE` error, catch and set message
3. Both show red error banner: "ไฟล์มีขนาดใหญ่เกิน 10MB กรุณาเลือกไฟล์ที่เล็กกว่า"

### 3-Image Layout Inconsistency
**Date:** 2026-05-05 | **Severity:** Low

### Problem
3 images showed different layouts between PostComposer preview and PostCard display.

### Solution
Both now use the same layout: left = 1 large image, right = 2 stacked images.
```tsx
// PostComposer and PostCard both use:
{mediaFiles.length === 3 ? (
  <div className="flex gap-2" style={{ height: '256px' }}>
    <div className="flex-1">รูปหลักใหญ่</div>
    <div className="flex-1 flex flex-col gap-2">
      {[1, 2].map((i) => <div key={i} className="flex-1">รูปย่อย</div>)}
    </div>
  </div>
) : (
  // grid layout for 1, 2, 4 images
)}
```

---

## Bug 16: Repost Banner — "You reposted" ใช้ currentUsername แทน loggedInUsername
**Date:** 2026-05-05 | **Severity:** Medium

### Problem
Banner "You reposted" แสดงผิด logic — เมื่อ @three ดู profile @oneone ที่รีโพสต์โพสต์ของ @twotwo → เห็น "You reposted" แทนที่จะเป็น "One One reposted"

### Root Cause
`PostCard` เปรียบเทียบ `repostedBy.username === currentUsername` โดย `currentUsername` คือ username ของ profile ที่กำลังดู (เช่น `oneone`) ไม่ใช่ username ของคนที่ login อยู่ (เช่น `three`)

### Solution
1. เพิ่ม prop ใหม่ `loggedInUsername?: string` ให้ `PostCard`
2. เปลี่ยน logic เปรียบเทียบเป็น `repostedBy.username === loggedInUsername`
3. แสดง `displayName` แทน `@username` ใน banner
4. ทุก page ที่ใช้ `PostCard` ต้องส่ง `loggedInUsername`:
   - `profile/[username]/page.tsx`: ดึงจาก `authApi.me().data.username`
   - `home/page.tsx`: ส่ง `currentUser.username`
   - `following/page.tsx`: ส่ง `currentUser.username`
   - `hashtag/[tag]/page.tsx`: ส่ง `currentUser.username`

### Logic ที่ถูกต้อง
```
banner แสดงเมื่อ post มี repostedBy:
- repostedBy.username === loggedInUsername → "You reposted"
- อื่นๆ → "{reposter's displayName} reposted"
```

### Files Modified
- `client/src/components/posts/PostCard.tsx` — เพิ่ม prop, แก้ logic banner
- `client/src/app/profile/[username]/page.tsx` — ดึง + ส่ง loggedInUsername
- `client/src/app/home/page.tsx` — ส่ง loggedInUsername
- `client/src/app/following/page.tsx` — ส่ง loggedInUsername
- `client/src/app/hashtag/[tag]/page.tsx` — ส่ง loggedInUsername

---

## Bug 17: Quoted Block — ไม่แสดงใน Thread Page และไม่แสดงรูป/เวลาใน Feed
**Date:** 2026-05-06 | **Severity:** High

### อาการ
1. **Thread page (`/posts/[id]`):** เข้า thread ของโพสต์ที่มี quoted post → ไม่เห็น quoted block เลย
2. **หน้า feed (`/home`, `/hashtag/[tag]`, `/following`):** quoted block แสดง text ได้ แต่ไม่แสดงรูปภาพ และไม่มี timestamp

### สาเหตุ — 4 จุด

#### จุดที่ 1: Backend — `getThread()` ไม่ include `quotedPost`
**ไฟล์:** `server/src/posts/posts.service.ts`

```typescript
// ❌ ก่อน — ไม่มี quotedPost
include: {
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  _count: { select: { likes: true, replies: true, reposts: true } },
},

// ✅ หลัง — เพิ่ม quotedPost
include: {
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  _count: { select: { likes: true, replies: true, reposts: true } },
  quotedPost: { select: { id: true, content: true, mediaUrls: true, createdAt: true, user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
},
```

#### จุดที่ 2: Frontend — `ThreadPost` interface ไม่มี `quotedPost`
**ไฟล์:** `client/src/app/posts/[id]/page.tsx`

```typescript
// ❌ ก่อน — ไม่มี quotedPost ใน interface

// ✅ หลัง
quotedPost?: {
  id: string
  content: string
  mediaUrls?: string[]
  createdAt?: string
  user: { username: string; displayName?: string; avatarUrl?: string | null }
}
```

#### จุดที่ 3: Frontend — PostCard ไม่ได้รับ `quotedPost` prop
**ไฟล์:** `client/src/app/posts/[id]/page.tsx`

```tsx
// ❌ ก่อน — ไม่ส่ง quotedPost
<PostCard post={{ id: post.id, user: {...}, content: post.content, ... }} />

// ✅ หลัง — เพิ่ม quotedPost prop
<PostCard
  post={{
    id: post.id,
    user: {...},
    content: post.content,
    quotedPost: post.quotedPost,  // ← เพิ่มตรงนี้
  }}
/>
```

#### จุดที่ 4: Frontend — `mapPost()` ไม่ map `mediaUrls` และ `createdAt` ของ quotedPost
**ไฟล์:** `client/src/app/home/page.tsx` + `client/src/app/hashtag/[tag]/page.tsx` + `client/src/app/following/page.tsx`

```typescript
// ❌ ก่อน — ไม่มี mediaUrls, createdAt
quotedPost: post.quotedPost
  ? {
      id: post.quotedPost.id,
      content: post.quotedPost.content,
      user: post.quotedPost.user,
    }
  : undefined,

// ✅ หลัง — เพิ่ม mediaUrls + createdAt
quotedPost: post.quotedPost
  ? {
      id: post.quotedPost.id,
      content: post.quotedPost.content,
      mediaUrls: post.quotedPost.mediaUrls,
      createdAt: post.quotedPost.createdAt,
      user: post.quotedPost.user,
    }
  : undefined,
```

### Files Modified
- `server/src/posts/posts.service.ts` — เพิ่ม `quotedPost` ใน Prisma include ของ `getThread()`
- `client/src/app/posts/[id]/page.tsx` — เพิ่ม `quotedPost` ใน `ThreadPost` interface + pass prop ไป PostCard
- `client/src/app/home/page.tsx` — เพิ่ม `mediaUrls` + `createdAt` ใน `mapPost()`
- `client/src/app/hashtag/[tag]/page.tsx` — เพิ่ม `mediaUrls` + `createdAt` ใน `mapPost()`
- `client/src/app/following/page.tsx` — เพิ่ม `quotedPost` เต็มๆ (ไม่มีเลย) ใน `mapPost()`

### บทเรียน
- ทุกครั้งที่สร้าง API endpoint ใหม่ หรือเพิ่ม relation ใน Prisma → ต้องตรวจสอบว่า include ครบทุก relation ที่ frontend ต้องการ
- `mapPost()` ทุกหน้าต้อง map `quotedPost` เหมือนกันหมด → ควร extract เป็น shared utility
- ถ้า UI ไม่แสดง → ไล่จาก API response → interface → map function → prop passing

---

## FAB Chat Unread Sync (May 2026)

### Symptom
Header mail icon and FAB badge showed different unread counts.

### Root Cause
1. FAB only counted once at mount — never updated
2. MessageDropdown showed dot only, not count
3. Header refetched on `messages_read`, FAB tried to decrement by 1

### Fix
- **Never use hardcoded decrement** (`prev - 1`) — always refetch from `/conversations` API
- On `messages_read` event: refetch from API
- MessageDropdown: show count badge, not just dot

---

## Systematic Debugging Checklist

When encountering any bug:
1. **Reproduce** — confirm the bug exists
2. **Isolate** — find the root cause (check API, check frontend state, check console)
3. **Fix** — apply the smallest possible fix
4. **Verify** — confirm the fix works
5. **Document** — add to this file if new bug pattern

**Common patterns in Nexus:**
- Stale closure → use `setFn((prev) => ...)`
- Filter too early → filter after server confirms
- Missing auth guard → check `@UseGuards(JwtAuthGuard)`
- Avatar 404 → validate absolute URL
- Sharp errors → use `require()` not `import`
