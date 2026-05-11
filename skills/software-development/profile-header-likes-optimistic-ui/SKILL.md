---
name: profile-header-likes-optimistic-ui
description: Fix profile header "Likes" stat to update optimistically when user likes/unlikes a post on the profile page. Backend sums all post likes; frontend updates header always (not gated by isOwnProfile).
---

# Profile Header Likes — Optimistic UI Pattern

## Problem
Profile header shows "Likes" = total likes received by all user's posts.
When user likes/unlikes a post on the profile page, the header stat doesn't update.

## Root Causes
1. `isOwnProfile` compared `username` strings which can mismatch due to case/format
2. Header update was gated behind `isOwnProfile` check — but profile page shows posts
   of the profile owner, so likes should update regardless of who is viewing
3. Backend `getProfile` returned `postsCount` instead of actual total likes

## Solution

### Backend (`users.service.ts`)
Return `likesCount` = sum of all likes on the user's posts:

```typescript
async getProfile(username: string, currentUserId?: string) {
  const user = await this.prisma.user.findUnique({
    where: { username },
    select: {
      id: true, username: true, name: true, displayName: true,
      avatarUrl: true, bannerUrl: true, bio: true, location: true,
      website: true, createdAt: true,
      _count: { select: { followers: true, following: true, posts: true } },
      posts: { select: { _count: { select: { likes: true } } } },
    },
  });

  const totalLikesReceived = user.posts.reduce(
    (sum, post) => sum + post._count.likes, 0
  );

  return {
    id: user.id, username: user.username, name: user.name,
    displayName: user.displayName, avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl, bio: user.bio, location: user.location,
    website: user.website, createdAt: user.createdAt,
    followersCount: user._count.followers,
    followingCount: user._count.following,
    postsCount: user._count.posts,
    likesCount: totalLikesReceived, // ← actual sum of likes
    isFollowing,
  };
}
```

### Frontend (`profile/[username]/page.tsx`)

**Key insight**: `likesCount` on the profile header represents the total likes
received by the posts being displayed. The posts on the profile page always belong
to the profile owner. So update the header `likesCount` whenever any post is liked,
regardless of whether the viewer is the profile owner.

```typescript
const handleLike = async (postId: string, optimisticLiked: boolean) => {
  const previousPosts = posts
  const previousLikesCount = profile?.likesCount ?? 0

  // Update post like state optimistically
  setPosts((current) =>
    current.map((p) =>
      p.id === postId
        ? { ...p, isLiked: optimisticLiked, likesCount: optimisticLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1) }
        : p
    )
  )

  // Update profile header likesCount — always do this (posts belong to profile owner)
  if (profile) {
    setProfile({
      ...profile,
      likesCount: optimisticLiked ? profile.likesCount + 1 : Math.max(0, profile.likesCount - 1),
    })
  }

  try {
    const res = await postApi.toggleLike(postId)
    setPosts((current) =>
      current.map((p) =>
        p.id === postId ? { ...p, isLiked: res.data.isLiked, likesCount: res.data.likesCount } : p
      )
    )
  } catch {
    // Rollback on error
    setPosts(previousPosts)
    if (profile) setProfile({ ...profile, likesCount: previousLikesCount })
  }
}
```

**Interface** must include `likesCount`:
```typescript
interface ProfileData {
  id: string; username: string; name: string; displayName: string | null;
  avatarUrl: string | null; bannerUrl: string | null; bio: string | null;
  location: string | null; website: string | null; createdAt: string;
  followersCount: number; followingCount: number; postsCount: number;
  likesCount: number; // sum of all likes on this user's posts
  isFollowing?: boolean;
}
```

## Key Pattern
- Header `likesCount` = sum of likes on displayed posts = always update on like/unlike
- Post `likesCount` = count on that specific post = use server truth after API call
- Don't gate header updates behind `isOwnProfile` — the posts being liked/unliked
  always belong to the profile owner being displayed
