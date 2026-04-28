import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async createPost(userId: string, content: string, mediaUrls: string[] = []) {
    return this.prisma.post.create({
      data: { userId, content, mediaUrls },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }

  async getPost(postId: string, currentUserId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
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

    return { ...post, liked };
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException();

    await this.prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  async toggleLike(userId: string, postId: string) {
    const existing = await this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await this.prisma.like.deleteMany({ where: { userId, postId } });
      return { liked: false };
    }

    await this.prisma.like.create({ data: { userId, postId } });
    return { liked: true };
  }

  async repost(userId: string, postId: string) {
    const existing = await this.prisma.repost.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    if (existing) return { success: true, message: 'Already reposted' };

    await this.prisma.repost.create({ data: { userId, postId } });
    return { success: true, message: 'Reposted' };
  }

  async unrepost(userId: string, postId: string) {
    await this.prisma.repost.deleteMany({ where: { userId, postId } });
    return { success: true, message: 'Unreposted' };
  }

  async quotePost(userId: string, postId: string, content: string) {
    const quoted = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!quoted || quoted.deletedAt) throw new NotFoundException('Post not found');

    return this.prisma.post.create({
      data: { userId, content, parentId: postId },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
  }

  async pinPost(_postId: string, _userId: string) {
    return { success: true, message: 'Pin not available' };
  }

  async unpinPost(_postId: string, _userId: string) {
    return { success: true, message: 'Unpin not available' };
  }

  async getFeed(userId: string, cursor?: string) {
    const take = 20;
    const where = cursor
      ? { createdAt: { lt: new Date(cursor) }, deletedAt: null }
      : { deletedAt: null };

    const posts = await this.prisma.post.findMany({
      where,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    let nextCursor: string | undefined;
    if (posts.length > take) {
      const extra = posts.pop();
      if (extra) nextCursor = extra.createdAt.toISOString();
    }

    return { posts, nextCursor };
  }

  async getFollowingFeed(userId: string, cursor?: string) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map(f => f.followingId);

    const take = 20;
    const where = cursor
      ? { userId: { in: followingIds }, createdAt: { lt: new Date(cursor) }, deletedAt: null }
      : { userId: { in: followingIds }, deletedAt: null };

    const posts = await this.prisma.post.findMany({
      where,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    let nextCursor: string | undefined;
    if (posts.length > take) {
      const extra = posts.pop();
      if (extra) nextCursor = extra.createdAt.toISOString();
    }

    return { posts, nextCursor };
  }

  async getUserPosts(username: string, _currentUserId?: string, cursor?: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    const take = 20;
    const where = cursor
      ? { userId: user.id, createdAt: { lt: new Date(cursor) }, deletedAt: null }
      : { userId: user.id, deletedAt: null };

    const posts = await this.prisma.post.findMany({
      where,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    let nextCursor: string | undefined;
    if (posts.length > take) {
      const extra = posts.pop();
      if (extra) nextCursor = extra.createdAt.toISOString();
    }

    return { posts, nextCursor };
  }

  async getUserLikedPosts(username: string, _currentUserId?: string, cursor?: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    const take = 20;
    const likeWhere = cursor
      ? { userId: user.id, createdAt: { lt: new Date(cursor) } }
      : { userId: user.id };

    const likes = await this.prisma.like.findMany({
      where: likeWhere,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            _count: { select: { likes: true, comments: true } },
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

    return { posts, nextCursor };
  }

  async getUserReposts(username: string, _currentUserId?: string, cursor?: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    const take = 20;
    const where = cursor
      ? { userId: user.id, createdAt: { lt: new Date(cursor) } }
      : { userId: user.id };

    const reposts = await this.prisma.repost.findMany({
      where,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            _count: { select: { likes: true, comments: true } },
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

    return { posts, nextCursor };
  }

  async getComments(postId: string, cursor?: string) {
    const take = 20;
    const where = cursor
      ? { postId, parentId: null, createdAt: { lt: new Date(cursor) } }
      : { postId, parentId: null };

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

  async createComment(userId: string, postId: string, content: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');

    return this.prisma.post.create({
      data: { userId, content, parentId: postId },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.post.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException();

    await this.prisma.post.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  async getThread(postId: string, _currentUserId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');

    const replies = await this.prisma.post.findMany({
      where: { parentId: postId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return { post, replies };
  }

  async createReply(userId: string, postId: string, content: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');

    return this.prisma.post.create({
      data: { userId, content, parentId: postId },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
  }
}