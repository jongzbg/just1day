# Bugs & Fixes

## Bug 1: posts.service.ts Encoding Corruption

**Date:** 2026-04-28
**Severity:** Critical

### Problem
`posts.service.ts` was corrupted - file contained garbage/encoded Chinese characters instead of TypeScript code.

### Root Cause
Unknown encoding issue (possibly save with wrong encoding, or file corruption).

### Solution
Rewrote the entire `PostsService` class based on the controller methods and Prisma schema.

### Files Modified
- `server/src/posts/posts.service.ts`

---

## Bug 2: Thread Page - Like/Repost Icon Colors Wrong

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

## Bug 4: .env.windows Committed with Secrets

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

### 2. Optimistic Update Pattern
```typescript
// 1. Update UI immediately
// 2. Call API
// 3. On error, rollback
```

### 3. Filter After Undo Pattern
```typescript
// When unliking/unreposting, filter from list if needed
return activeTab === 'posts'
  ? synced.filter((p) => !(p.id === postId && !p.isLiked))
  : synced
```