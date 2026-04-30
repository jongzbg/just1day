# Frontend Pages

## Page Structure

```
client/src/app/
├── page.tsx                    # Redirects to /home
├── login/
│   └── page.tsx               # Login/Register
├── home/
│   └── page.tsx               # For You feed
├── following/
│   └── page.tsx               # Following feed
├── posts/
│   └── [id]/
│       └── page.tsx           # Post detail + thread
├── profile/
│   └── [username]/
│       └── page.tsx           # User profile
└── edit-profile/
    └── page.tsx               # Edit own profile
```

## Page Details

### Home (`/home`)
- Algorithmic "For You" feed
- Post composer at top
- Infinite scroll with cursor pagination
- Actions: like, repost, quote, comment, delete, pin

### Following (`/following`)
- Posts from followed users only
- Same UI as home page
- Shows only last 24 hours

### Post Detail (`/posts/:id`)
- Single post with full content
- Thread replies below
- Inline reply input
- Like/repost on main post and replies

### Profile (`/profile/:username`)
- Banner + avatar + bio
- Stats: followers, following, posts, likes
- Tabs: Posts | Likes
- Follow/Unfollow button (if not own profile)
- Post composer (if own profile)

### Edit Profile (`/edit-profile`)
- Edit display name, bio, location, website
- Avatar/banner URL inputs
- Preview images

## Components

| Component | Location | Purpose |
|----------|----------|---------|
| `MainLayout` | `components/layout/` | 3-column layout wrapper |
| `Header` | `components/layout/` | Top nav + search |
| `LeftSidebar` | `components/layout/` | Leaderboards |
| `RightSidebar` | `components/layout/` | Trending |
| `BottomNav` | `components/layout/` | Mobile nav |
| `FAB` | `components/layout/` | Floating action button |
| `PostCard` | `components/posts/` | Single post display |
| `PostComposer` | `components/posts/` | New post form |
| `PostActions` | `components/posts/` | Like/repost/comment buttons |
| `CommentModal` | `components/posts/` | Comments overlay |
| `QuoteModal` | `components/posts/` | Quote post overlay |
| `ProfileHeader` | `components/profile/` | Profile info + follow button |

## API Client

Location: `client/src/lib/api.ts`

```typescript
// Auth
api.post('/auth/register', data)
api.post('/auth/login', data)
api.get('/auth/me')

// Posts
api.get('/posts/feed')
api.get('/posts/following-feed')
api.get('/posts/user/:username')
api.post('/posts')
api.post('/posts/:id/like')
api.post('/posts/:id/repost')

// Users
api.get('/users/search')
api.get('/users/:username')
api.patch('/users/me')
api.post('/users/:id/follow')
```