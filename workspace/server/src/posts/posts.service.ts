import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async createPost(userId: string, username: string, content: string, mediaUrls: string[] = []) {
    return this.prisma.post.create({
      data: { userId, username, content, mediaUrls },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });
  }

  async getPost(postId: string, currentUserId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, replies: true, reposts: true } },
      },
    });
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');

    let liked = false;
    if (currentUserId) {
      const like = await this.prisma.like.findUnique({
        where: { userId_postId: { userId: currentUserId, postId } },
      });
      liked = !!like;
    }

    return {
      ...post,
      isLiked: liked,
      likesCount: post._count.likes,
      commentsCount: post._count.replies,
      repostsCount: post._count.reposts,
      liked,
    };
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException();

    await this.prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  async toggleLike(userId: string, postId: string) {
    console.log('[toggleLike] userId:', userId, 'postId:', postId);
    const existing = await this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    console.log('[toggleLike] existing:', existing);

    if (existing) {
      await this.prisma.like.deleteMany({ where: { userId, postId } });
      await this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
        select: { _count: { select: { likes: true } } },
      });
      // Delete LIKE notification when unliking
      await this.prisma.notification.deleteMany({
        where: { type: 'LIKE', actorId: userId, postId },
      });
      return { isLiked: false, liked: false, likesCount: (await this.prisma.post.findUnique({ where: { id: postId }, select: { _count: { select: { likes: true } } } }))?._count.likes ?? 0 };
    }

    await this.prisma.like.create({ data: { userId, postId } });
    console.log('[toggleLike] Like created');

    // Create notification - only if not already exists
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
    if (post && post.userId !== userId) {
      const existingNotif = await this.prisma.notification.findFirst({
        where: { type: 'LIKE', actorId: userId, postId },
      });
      if (!existingNotif) {
        await this.prisma.notification.create({
          data: { type: 'LIKE', userId: post.userId, actorId: userId, postId },
        });
      }
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { likesCount: { increment: 1 } },
      select: { _count: { select: { likes: true } } },
    });
    return { isLiked: true, liked: true, likesCount: updated._count.likes };
  }

  async repost(userId: string, postId: string) {
    const existing = await this.prisma.repost.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    if (existing) {
      const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { _count: { select: { reposts: true } } } });
      return { isReposted: true, success: true, repostsCount: post?._count.reposts ?? 0 };
    }

    await this.prisma.repost.create({ data: { userId, postId } });

    // Create notification - only if not already exists
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
    if (post && post.userId !== userId) {
      const existingNotif = await this.prisma.notification.findFirst({
        where: { type: 'REPOST', actorId: userId, postId },
      });
      if (!existingNotif) {
        await this.prisma.notification.create({
          data: { type: 'REPOST', userId: post.userId, actorId: userId, postId },
        });
      }
    }

    const updated = await this.prisma.post.findUnique({ where: { id: postId }, select: { _count: { select: { reposts: true } } } });
    return { isReposted: true, success: true, repostsCount: updated?._count.reposts ?? 0 };
  }

  async unrepost(userId: string, postId: string) {
    await this.prisma.repost.deleteMany({ where: { userId, postId } });
    // Delete REPOST notification when un-reposting
    await this.prisma.notification.deleteMany({
      where: { type: 'REPOST', actorId: userId, postId },
    });
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { _count: { select: { reposts: true } } } });
    return { isReposted: false, success: true, repostsCount: post?._count.reposts ?? 0 };
  }

  async quotePost(userId: string, username: string, postId: string, content: string) {
    const quoted = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!quoted || quoted.deletedAt) throw new NotFoundException('Post not found');

    const newPost = await this.prisma.post.create({
      data: { userId, username, content, parentId: postId },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    // Create notification
    if (quoted.userId !== userId) {
      await this.prisma.notification.create({
        data: { type: 'QUOTE', userId: quoted.userId, actorId: userId, postId },
      });
    }

    return newPost;
  }

  async pinPost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.$transaction(async (tx) => {
      // Unpin any currently pinned post from this user
      await tx.post.updateMany({
        where: { userId, isPinned: true },
        data: { isPinned: false },
      });
      // Pin the requested post
      return tx.post.update({
        where: { id: postId },
        data: { isPinned: true },
        select: { isPinned: true },
      });
    });
    return { success: true, isPinned: updated.isPinned };
  }

  async unpinPost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { isPinned: false },
      select: { isPinned: true },
    });
    return { success: true, isPinned: updated.isPinned };
  }

  async getFeed(userId: string, cursor?: string) {
    const take = 20;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where = cursor
      ? { createdAt: { lt: new Date(cursor) }, deletedAt: null, parentId: null }
      : { createdAt: { gte: yesterday }, deletedAt: null, parentId: null };

    const posts = await this.prisma.post.findMany({
      where,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, replies: true, reposts: true } },
      },
    });

    const postIds = posts.map(p => p.id);
    const [likes, reposts, replyCounts] = await Promise.all([
      this.prisma.like.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }),
      this.prisma.repost.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true, user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      }),
      this.prisma.post.groupBy({
        by: ['parentId'],
        where: { parentId: { in: postIds }, deletedAt: null },
        _count: { parentId: true },
      }),
    ]);
    const likedSet = new Set(likes.map(l => l.postId));
    const repostedMap = new Map(reposts.map(r => [r.postId, r.user]));
    const replyCountMap = new Map(replyCounts.map(r => [r.parentId!, r._count.parentId]));

    let nextCursor: string | undefined;
    if (posts.length > take) {
      const extra = posts.pop();
      if (extra) nextCursor = extra.createdAt.toISOString();
    }

    return {
      posts: posts.map(p => ({
        ...p,
        isLiked: likedSet.has(p.id),
        isReposted: repostedMap.has(p.id),
        isPinned: p.isPinned,
        likesCount: p._count.likes,
        commentsCount: replyCountMap.get(p.id) ?? 0,
        repostsCount: p._count.reposts,
        repostedBy: repostedMap.has(p.id)
          ? { id: repostedMap.get(p.id)!.id, username: repostedMap.get(p.id)!.username, displayName: repostedMap.get(p.id)!.displayName, avatarUrl: repostedMap.get(p.id)!.avatarUrl }
          : undefined,
      })),
      nextCursor,
    };
  }

  async getFollowingFeed(userId: string, cursor?: string) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map(f => f.followingId);

    const take = 20;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where = cursor
      ? { userId: { in: followingIds }, createdAt: { lt: new Date(cursor) }, deletedAt: null, parentId: null }
      : { userId: { in: followingIds }, createdAt: { gte: yesterday }, deletedAt: null, parentId: null };

    const posts = await this.prisma.post.findMany({
      where,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, replies: true, reposts: true } },
      },
    });

    const postIds = posts.map(p => p.id);
    const [likes, reposts, replyCounts] = await Promise.all([
      this.prisma.like.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }),
      this.prisma.repost.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true, user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      }),
      this.prisma.post.groupBy({
        by: ['parentId'],
        where: { parentId: { in: postIds }, deletedAt: null },
        _count: { parentId: true },
      }),
    ]);
    const likedSet = new Set(likes.map(l => l.postId));
    const repostedMap = new Map(reposts.map(r => [r.postId, r.user]));
    const replyCountMap = new Map(replyCounts.map(r => [r.parentId!, r._count.parentId]));

    let nextCursor: string | undefined;
    if (posts.length > take) {
      const extra = posts.pop();
      if (extra) nextCursor = extra.createdAt.toISOString();
    }

    return {
      posts: posts.map(p => ({
        ...p,
        isLiked: likedSet.has(p.id),
        isReposted: repostedMap.has(p.id),
        isPinned: p.isPinned,
        likesCount: p._count.likes,
        commentsCount: replyCountMap.get(p.id) ?? 0,
        repostsCount: p._count.reposts,
        repostedBy: repostedMap.has(p.id)
          ? { id: repostedMap.get(p.id)!.id, username: repostedMap.get(p.id)!.username, displayName: repostedMap.get(p.id)!.displayName, avatarUrl: repostedMap.get(p.id)!.avatarUrl }
          : undefined,
      })),
      nextCursor,
    };
  }

  async getUserPosts(username: string, _currentUserId?: string, cursor?: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    const take = 20;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where = cursor
      ? { userId: user.id, deletedAt: null, parentId: null, createdAt: { lt: new Date(cursor) } }
      : { userId: user.id, deletedAt: null, parentId: null, createdAt: { gte: yesterday } };

    // Fetch original posts AND reposts, then merge + sort
    const [posts, reposts] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          _count: { select: { likes: true, replies: true, reposts: true } },
        },
      }),
      this.prisma.repost.findMany({
        where: { userId: user.id, createdAt: { gte: yesterday }, post: { deletedAt: null, createdAt: { gte: yesterday } } },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          post: {
            include: {
              user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
              _count: { select: { likes: true, replies: true, reposts: true } },
            },
          },
        },
      }),
    ]);

    // Build merged list: original posts + reposts
    const merged: any[] = [
      ...posts.map(p => ({
        ...p,
        isReposted: false,
        repostedBy: undefined,
        // For pagination: use post's createdAt
        _sortAt: p.createdAt,
      })),
      ...reposts.map(r => ({
        ...r.post,
        isReposted: true,
        repostedBy: { id: r.user.id, username: r.user.username, displayName: r.user.displayName, avatarUrl: r.user.avatarUrl },
        // For pagination: use Repost.createdAt
        _sortAt: r.createdAt,
      })),
    ];

    // Sort by _sortAt desc
    merged.sort((a, b) => new Date(b._sortAt).getTime() - new Date(a._sortAt).getTime());

    // Apply cursor-based pagination
    let sliceStart = 0;
    if (cursor) {
      const cursorIdx = merged.findIndex(p => p._sortAt.toISOString() === cursor);
      if (cursorIdx >= 0) sliceStart = cursorIdx + 1;
    }
    const page = merged.slice(sliceStart, sliceStart + take + 1);
    const hasMore = page.length > take;
    if (hasMore) page.pop();

    const nextCursor = hasMore && page.length > 0
      ? page[page.length - 1]._sortAt.toISOString()
      : undefined;

    const postIds = page.map(p => p.id);
    const [likes, userReposts, replyCounts] = await Promise.all([
      this.prisma.like.findMany({ where: { postId: { in: postIds }, userId: _currentUserId ?? '' }, select: { postId: true } }),
      this.prisma.repost.findMany({
        where: { postId: { in: postIds }, userId: _currentUserId ?? '' },
        select: { postId: true, user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      }),
      this.prisma.post.groupBy({
        by: ['parentId'],
        where: { parentId: { in: postIds }, deletedAt: null },
        _count: { parentId: true },
      }),
    ]);
    const likedSet = new Set(likes.map(l => l.postId));
    const repostedMap = new Map(userReposts.map(r => [r.postId, r.user]));
    const replyCountMap = new Map(replyCounts.map(r => [r.parentId!, r._count.parentId]));

    return {
      posts: page.map(p => ({
        ...p,
        isLiked: likedSet.has(p.id),
        isReposted: repostedMap.has(p.id),
        isPinned: p.isPinned,
        likesCount: p._count.likes,
        commentsCount: replyCountMap.get(p.id) ?? 0,
        repostsCount: p._count.reposts,
      })),
      nextCursor,
    };
  }

  async getUserLikedPosts(username: string, _currentUserId?: string, cursor?: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    const take = 20;
    // Always filter: only posts created within the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const likeWhere = cursor
      ? { userId: user.id, createdAt: { lt: new Date(cursor) }, post: { createdAt: { gte: yesterday } } }
      : { userId: user.id, post: { createdAt: { gte: yesterday } } };

    const likes = await this.prisma.like.findMany({
      where: likeWhere,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            _count: { select: { likes: true, replies: true, reposts: true } },
          },
        },
      },
    });

    let nextCursor: string | undefined;
    const posts = likes.map(l => l.post).filter(Boolean);
    if (posts.length > take) {
      const extra = posts.pop();
      if (extra) nextCursor = extra.createdAt.toISOString();
    }

    const postIds = posts.map(p => p.id);
    const [reposts, replyCounts] = await Promise.all([
      this.prisma.repost.findMany({
        where: { postId: { in: postIds }, userId: _currentUserId ?? '' },
        select: { postId: true },
      }),
      this.prisma.post.groupBy({
        by: ['parentId'],
        where: { parentId: { in: postIds }, deletedAt: null },
        _count: { parentId: true },
      }),
    ]);
    const repostedSet = new Set(reposts.map(r => r.postId));
    const replyCountMap = new Map(replyCounts.map(r => [r.parentId!, r._count.parentId]));

    return {
      posts: posts.map(p => ({
        ...p,
        isLiked: true,
        isReposted: repostedSet.has(p.id),
        likesCount: p._count.likes,
        commentsCount: replyCountMap.get(p.id) ?? 0,
        repostsCount: p._count.reposts,
      })),
      nextCursor,
    };
  }

  async getUserReposts(username: string, _currentUserId?: string, cursor?: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    const take = 20;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // For reposts, filter by the original post's createdAt (not the repost's createdAt)
    // Only show reposts where the original post is within 24h
    const where = cursor
      ? { userId: user.id, post: { createdAt: { lt: new Date(cursor) } } }
      : { userId: user.id, post: { createdAt: { gte: yesterday } } };

    const reposts = await this.prisma.repost.findMany({
      where,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        post: {
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            _count: { select: { likes: true, replies: true, reposts: true } },
          },
        },
      },
    });

    let nextCursor: string | undefined;
    const posts = reposts.map(r => r.post).filter(Boolean);
    if (posts.length > take) {
      const extra = posts.pop();
      if (extra) nextCursor = extra.createdAt.toISOString();
    }

    const postIds = posts.map(p => p.id);
    const [likes, replyCounts] = await Promise.all([
      this.prisma.like.findMany({
        where: { postId: { in: postIds }, userId: _currentUserId ?? '' },
        select: { postId: true },
      }),
      this.prisma.post.groupBy({
        by: ['parentId'],
        where: { parentId: { in: postIds }, deletedAt: null },
        _count: { parentId: true },
      }),
    ]);
    const likedSet = new Set(likes.map(l => l.postId));
    const replyCountMap = new Map(replyCounts.map(r => [r.parentId!, r._count.parentId]));

    return {
      posts: reposts.map(r => ({
        ...r.post,
        isLiked: likedSet.has(r.post.id),
        isReposted: true,
        likesCount: r.post._count.likes,
        commentsCount: replyCountMap.get(r.post.id) ?? 0,
        repostsCount: r.post._count.reposts,
        repostedBy: { id: r.user.id, username: r.user.username, displayName: r.user.displayName },
      })),
      nextCursor,
    };
  }

  async getComments(postId: string, cursor?: string) {
    const take = 20;
    const where = cursor
      ? { parentId: postId, deletedAt: null, createdAt: { lt: new Date(cursor) } }
      : { parentId: postId, deletedAt: null };

    const comments = await this.prisma.post.findMany({
      where,
      take: take + 1,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true } },
      },
    });

    let nextCursor: string | undefined;
    if (comments.length > take) {
      const extra = comments.pop();
      if (extra) nextCursor = extra.createdAt.toISOString();
    }

    return { comments, nextCursor };
  }

  async createComment(userId: string, username: string, postId: string, content: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');

    const comment = await this.prisma.post.create({
      data: { userId, username, content, parentId: postId },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    // Create notification
    if (post.userId !== userId) {
      await this.prisma.notification.create({
        data: { type: 'COMMENT', userId: post.userId, actorId: userId, postId },
      });
    }

    return comment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.post.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException();

    await this.prisma.post.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  async getThread(postId: string, currentUserId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, replies: true, reposts: true } },
      },
    });
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');

    const replies = await this.prisma.post.findMany({
      where: { parentId: postId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });

    // Check current user's like/repost status
    let isLiked = false;
    let isReposted = false;
    if (currentUserId) {
      const [like, repost] = await Promise.all([
        this.prisma.like.findUnique({
          where: { userId_postId: { userId: currentUserId, postId } },
        }),
        this.prisma.repost.findUnique({
          where: { userId_postId: { userId: currentUserId, postId } },
        }),
      ]);
      isLiked = !!like;
      isReposted = !!repost;
    }

    return {
      post: {
        ...post,
        likesCount: post._count.likes,
        commentsCount: replies.length,
        repostsCount: post._count.reposts,
        isLiked,
        isReposted,
        isPinned: post.isPinned,
      },
      replies: replies.map(r => ({
        ...r,
        likesCount: r._count.likes,
        repliesCount: r._count.replies,
      })),
    };
  }

  async createReply(userId: string, username: string, postId: string, content: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');

    return this.prisma.post.create({
      data: { userId, username, content, parentId: postId },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
  }
}