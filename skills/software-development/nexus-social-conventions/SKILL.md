---
name: nexus-social-conventions
description: Nexus Social (Next.js + NestJS + PostgreSQL) conventions, bugs, patterns, and project knowledge. Always load when working on Nexus.
tags: [nexus, nextjs, nestjs, prisma, postgresql, fullstack]
triggers:
  - "nexus"
  - "Nexus Social"
  - "/workspace/workspace"
  - "posts.service"
  - "profile page"
  - "post card"
  - "fab chat"
  - "upload avatar"
  - "sharp"
created: 2026-04-26
updated: 2026-05-05
---

# Nexus Social — Project Conventions

## ⚠️ CRITICAL: Never Convert File Encoding
- The project's `posts.service.ts` contains Thai/CJK comments and identifiers
- Any attempt to convert file encoding (e.g. UTF-16LE → UTF-8, base64 decode, Node.js Buffer tricks, etc.) will **corrupt .ts and .js files permanently**
- **Use only `patch` tool** for all file edits — it preserves encoding safely
- **Never** use `terminal` with `echo`, `cat`, `node -e fs.writeFileSync`, or redirection (`>`) to overwrite `.ts` `.tsx` `.js` `.json` source files

## Project Locations

| | Path |
|---|---|
| Server (NestJS) | `/workspace/workspace/server` |
| Client (Next.js) | `/workspace/workspace/client` |
| Vault docs | `/workspace/workspace/vault/00 - Projects/Nexus/` |
| Backend port | **3001** (NOT 3000) |
| Frontend port | 3000 |

**Restart server after source changes:**
```bash
# Inside /workspace/workspace/server
ps aux | grep "node dist/main"  # find PID
kill <PID>
npx tsc -p tsconfig.build.json
node dist/main &
```

## Database — Docker Desktop on Windows + WSL

- **Windows/Host** → `localhost:5432` (e.g. in .env)
- **WSL2** → Docker Desktop exposes on `localhost:5432` too
- `DATABASE_URL=postgresql://nexus:nexus_dev@localhost:5432/nexus` ✅
- After editing `.env`, rebuild: `npx tsc -p tsconfig.build.json`

## Routes order in NestJS
Static routes (`@Get('search')`) must come BEFORE dynamic routes (`@Get(':username')`) — otherwise `/users/search` matches `:username = 'search'`.

## Comment Count Mismatch — Post Table Only

The project uses **Post table only** (no separate Comment table) — `createComment` creates a new Post with `parentId`.

Fix in posts.service.ts (all fixed):
1. Replace `_count: { select: { likes: true, comments: true } }` → `{ likes: true, replies: true, reposts: true }`
2. Map response: `likesCount: p._count.likes`, `commentsCount: p._count.replies`, `repostsCount: p._count.reposts`
3. In `getThread`, map replies too: `repliesCount: r._count.replies`

## Critical Frontend Patterns

### Avatar URLs
Must be absolute URL or prepend API_BASE_URL for relative paths:
```typescript
if (url?.startsWith('http')) return url
if (url?.startsWith('/')) return `${API_BASE_URL}${url}`
return `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`
```

### Stale Closure — Use Functional Updates
```typescript
// WRONG (stale closure)
setPosts(update(posts))
setPosts(sync(posts))  // uses old posts!

// CORRECT (functional update)
setFn((prev) => update(prev))
setFn((prev) => sync(prev))  // uses latest prev
```

### Filter After Confirm
- Unlike on Tab Likes: filter only **after** server confirms, not optimistically
- Undo repost on Tab Posts: filter post out because it's no longer a repost
- Both tabs must not filter the wrong list

### PostActions container needs `px-4` padding to avoid edge collision

## Sharp Image Processing

`POST /upload/avatar` uses Sharp. **Must use CommonJS require:**
```typescript
// WRONG (ESM import)
import sharp from 'sharp'

// CORRECT (CommonJS require)
const sharp = require('sharp')
```
Also required `sharp.clone()` before each resize operation.

## UpdateProfile DTO

`avatarUrl` and `bannerUrl` must use `@IsString()` NOT `@IsUrl()`:
```typescript
@IsOptional()
@IsString()  // was @IsUrl()
avatarUrl?: string;
```

## Chat Feature

- **Backend:** ✅ Complete (WebSocket gateway, DB schema, cleanup cron, `chat-cleanup.service.ts`, `chat-cleanup.task.ts`)
- **Frontend Chat Page:** ✅ Complete
- **FAB Chat Widget:** ✅ Complete (FABWidget, FABChatView, FABConversationList, FABChatContext)
- Schema: `Conversation`, `ConversationParticipant`, `Message`, `uniqueUserPair` for 1-1 deduplication
- Auto-delete after 24h via cron (`@Cron('*/5 * * * *')`)

### FAB Unread Sync Pattern (May 2026)
- **Never decrement/increment count locally** → always refetch from `/conversations` API
- On `messages_read` event: refetch from API, don't hardcode `-1`
- FABConversationList listens to `messages_read` to refetch conversations

## Real-time Events (window.dispatchEvent)

| Event | Trigger | Listener |
|-------|---------|----------|
| `nexus:post-created` | PostComposer success | RightSidebar |
| `nexus:like-changed` | handleLike toggleLike API | LeftSidebar |
| `messages_read` | Message opened/read | FABChatContext, FABConversationList, MessageDropdown |
| `fab_message_sent` | Message sent confirmed | FABConversationList, MessageDropdown |

## Followers/Following List

- Backend: `GET /users/:username/followers` + `GET /users/:username/following`
- Frontend: `<FollowListModal>` — tabbed modal, Follow/Unfollow button inside
- Stats on ProfileHeader are `<button>` elements — open modal on click

## All Pages

| Route | Description |
|-------|-------------|
| `/home` | For You feed — infinite scroll, PostComposer, cursor pagination |
| `/following` | Following feed — last 24h, same UI as home |
| `/hashtag/[tag]` | 3 tabs: Popular (likes sort), Latest (time sort), Following |
| `/posts/[id]` | Thread view — uses `<PostCard>`, inline reply input |
| `/profile/[username]` | Tabs: Posts / Likes. Avatar → lightbox (others) or dropdown (own) |
| `/edit-profile` | Avatar upload → Sharp → 3 WebP sizes (thumb/medium/full) |
| `/messages` | Full chat page (FAB Chat is separate overlay) |

## Image & Media Posting (May 2026)

### Limits
- **Max file size:** 10MB per file (set in `upload.controller.ts` FileInterceptor)
- **Max images per post:** 4 images (checked in `PostComposer.tsx` `handleFileSelect`)

### Error 413 — 10MB Limit
- Source: NestJS FileInterceptor (`fileSize: 10 * 1024 * 1024`)
- No nginx involved (no nginx running)
- Frontend catches 413 via `err?.response?.status` and shows red error banner
- Error messages in Thai: "ไฟล์มีขนาดใหญ่เกิน 10MB กรุณาเลือกไฟล์ที่เล็กกว่า"

### 3-Image Layout
**Both PostComposer and PostCard must use identical layout:**
```
┌─────────────────┬──────────────┐
│                 │   [รูป 2]    │
│    [รูป 1]      │              │
│    (ใหญ่)       ├──────────────┤
│                 │   [รูป 3]    │
└─────────────────┴──────────────┘
```
- Left: 1 large image (flex-1)
- Right: 2 stacked images (flex-1 flex flex-col)
- Height: 400px (PostCard), 256px (PostComposer preview)

### 4-Image Layout
- grid 2x2

## Bug Index (16 bugs — full details in `nexus-bugs-fixes` skill)

## Vault Location
`/workspace/workspace/vault/00 - Projects/Nexus/`

## Vault Learning Docs
`/workspace/workspace/vault/01 - Learning/Concepts/` — concepts including Image-Posting.md
