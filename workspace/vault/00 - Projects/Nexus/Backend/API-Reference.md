# API Reference

Base URL: `http://localhost:3001`

## Authentication

### Register
```
POST /auth/register
Body: { email, password, username, name }
Response: { user, accessToken }
```

### Login
```
POST /auth/login
Body: { email, password }
Response: { accessToken }
```

### Get Current User
```
GET /auth/me
Headers: Authorization: Bearer <token>
Response: { user }
```

---

## Users

### Search Users
```
GET /users/search?q=<query>&limit=10
Headers: Authorization: Bearer <token>
Response: User[]
```

### Get User Profile
```
GET /users/:username
Headers: Authorization: Bearer <token>
Response: { id, username, displayName, avatarUrl, bio, ... }
```

### Update Profile
```
PATCH /users/me
Headers: Authorization: Bearer <token>
Body: { displayName?, bio?, location?, website?, avatarUrl?, bannerUrl? }
Response: Updated user object
```

### Follow User
```
POST /users/:id/follow
Headers: Authorization: Bearer <token>
Response: { success: true }
```

### Unfollow User
```
DELETE /users/:id/follow
Headers: Authorization: Bearer <token>
Response: { success: true }
```

### Get Top Creators
```
GET /users/top/creators?limit=10
Headers: Authorization: Bearer <token>
Response: User[] ordered by followers
```

### Get Most Likes
```
GET /users/most-likes?limit=10
Headers: Authorization: Bearer <token>
Response: User[] ordered by total likes received
```

---

## Posts

### Get Feed (For You)
```
GET /posts/feed?cursor=<timestamp>&limit=20
Headers: Authorization: Bearer <token>
Response: { posts[], nextCursor }
```

### Get Following Feed
```
GET /posts/following-feed?cursor=<timestamp>&limit=20
Headers: Authorization: Bearer <token>
Response: { posts[], nextCursor }
```

### Get User Posts
```
GET /posts/user/:username?cursor=<timestamp>&limit=20
Headers: Authorization: Bearer <token>
Response: { posts[], nextCursor }
```

### Get Single Post
```
GET /posts/:id
Headers: Authorization: Bearer <token>
Response: Post object with { isLiked, likesCount, commentsCount, repostsCount }
```

### Create Post
```
POST /posts
Headers: Authorization: Bearer <token>
Body: { content, mediaUrls? }
Response: Created post object
```

### Delete Post
```
DELETE /posts/:id
Headers: Authorization: Bearer <token>
Response: { success: true }
```

### Like Post
```
POST /posts/:id/like
Headers: Authorization: Bearer <token>
Response: { isLiked: true, likesCount: N }
```

### Unlike Post
```
POST /posts/:id/like
Headers: Authorization: Bearer <token>
Response: { isLiked: false, likesCount: N }
```

### Repost
```
POST /posts/:id/repost
Headers: Authorization: Bearer <token>
Response: { isReposted: true, repostsCount: N }
```

### Undo Repost
```
DELETE /posts/:id/repost
Headers: Authorization: Bearer <token>
Response: { isReposted: false, repostsCount: N }
```

### Quote Post
```
POST /posts/:id/quote
Headers: Authorization: Bearer <token>
Body: { content }
Response: Created post object
```

### Get Post Thread (Replies)
```
GET /posts/:id/thread
Headers: Authorization: Bearer <token>
Response: { post, replies[] }
```

### Get Comments
```
GET /posts/:id/comments?cursor=<timestamp>
Headers: Authorization: Bearer <token>
Response: { comments[], nextCursor }
```

### Add Comment
```
POST /posts/:id/comment
Headers: Authorization: Bearer <token>
Body: { content }
Response: Created comment object
```

### Delete Comment
```
DELETE /posts/comments/:commentId
Headers: Authorization: Bearer <token>
Response: { success: true }
```

### Pin Post
```
POST /posts/:id/pin
Headers: Authorization: Bearer <token>
Response: { success: true }
```

### Unpin Post
```
DELETE /posts/:id/pin
Headers: Authorization: Bearer <token>
Response: { success: true }
```

---

## Response Shapes

### Post Object
```typescript
{
  id: string
  content: string
  mediaUrls: string[]
  createdAt: string
  user: {
    id: string
    username: string
    displayName: string
    avatarUrl: string
  }
  isLiked: boolean
  isReposted: boolean
  likesCount: number
  commentsCount: number
  repostsCount: number
}
```

### User Object
```typescript
{
  id: string
  username: string
  displayName: string
  avatarUrl: string
  bannerUrl: string
  bio: string
  location: string
  website: string
  followersCount: number
  followingCount: number
  postsCount: number
  likesCount: number
  isFollowing: boolean
}
```