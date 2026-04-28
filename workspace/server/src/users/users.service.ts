import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  async getProfile(username: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        displayName: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        location: true,
        website: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
        // Get ALL posts (including soft-deleted) for total likes count
        posts: {
          select: {
            _count: {
              select: { likes: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Sum up ALL likes received (including soft-deleted/hidden posts)
    const totalLikesReceived = user.posts.reduce(
      (sum, post) => sum + post._count.likes,
      0,
    );

    // Count likes received today (on active posts only)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const likesToday = await this.prisma.like.count({
      where: {
        post: {
          userId: user.id,
          deletedAt: null,
        },
        createdAt: { gte: todayStart },
      },
    });

    // Check if current user is following this user
    let isFollowing = false;
    if (currentUserId) {
      const follow = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      location: user.location,
      website: user.website,
      createdAt: user.createdAt,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      postsCount: user._count.posts,
      likesCount: totalLikesReceived,
      likesTodayCount: likesToday,
      isFollowing,
    };
  }

  async updateProfile(userId: string, data: {
    displayName?: string;
    bio?: string;
    location?: string;
    website?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        location: true,
        website: true,
        createdAt: true,
      },
    });
  }

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    // Check if already following
    const existing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existing) {
      return { success: true, message: 'Already following' };
    }

    await this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    return { success: true, message: 'Followed successfully' };
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow.deleteMany({
      where: {
        followerId,
        followingId,
      },
    });

    return { success: true, message: 'Unfollowed successfully' };
  }

  async getTopCreators(limit: number = 10) {
    // Get users ordered by total likes received on their posts
    const users = await this.prisma.user.findMany({
      take: limit,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        _count: {
          select: {
            followers: true,
            posts: true,
          },
        },
        posts: {
          select: {
            _count: {
              select: { likes: true },
            },
          },
        },
      },
    });

    const withLikes = users.map(u => ({
      ...u,
      likesCount: u.posts.reduce((s, p) => s + p._count.likes, 0),
    })).filter(u => u.likesCount > 0);
    withLikes.sort((a, b) => b.likesCount - a.likesCount);

    return withLikes.map(({ posts, ...rest }) => rest);
  }

  async searchUsers(query: string, limit: number = 10) {
    if (!query || query.trim().length < 1) {
      return [];
    }

    const searchTerm = query.trim();

    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: searchTerm, mode: 'insensitive' } },
          { displayName: { contains: searchTerm, mode: 'insensitive' } },
          { name: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: {
        id: true,
        username: true,
        displayName: true,
        name: true,
        avatarUrl: true,
        _count: {
          select: {
            posts: true,
            followers: true,
          },
        },
      },
      orderBy: [
        // Prioritize exact prefix match
        { username: 'asc' },
      ],
    });
  }
}
