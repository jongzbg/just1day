import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { existsSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class VideoCleanupService implements OnModuleInit {
  private readonly logger = new Logger(VideoCleanupService.name);
  private readonly queue: Queue;
  private worker: Worker;
  private readonly OUTPUT_DIR = './storage/videos/output';
  private readonly TEMP_DIR = './storage/videos/temp';
  private readonly TEMP_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

  constructor(private prisma: PrismaService) {
    this.queue = new Queue('video-cleanup', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    });

    this.worker = new Worker(
      'video-cleanup',
      async (job) => this.processJob(job),
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        },
        concurrency: 2,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`✅ Cleanup job ${job.id} completed`);
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(`❌ Cleanup job ${job?.id} failed: ${error.message}`);
    });
  }

  async onModuleInit() {
    this.logger.log('VideoCleanupService initialized');
    // Cleanup stale temp files on startup
    this.cleanupStaleTempFiles();
  }

  // ── Enqueue cleanup job with delay ─────────────────────────────────────────
  async enqueueCleanup(videoId: string): Promise<void> {
    await this.queue.add(
      'cleanup-video',
      { videoId },
      {
        jobId: `cleanup-${videoId}`,
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
        // Delay 5 minutes before cleanup (user might undo delete)
        delay: 5 * 60 * 1000,
      },
    );
    this.logger.log(`Cleanup job enqueued for video ${videoId.slice(-8)} (delay: 5min)`);
  }

  // ── Process cleanup job ────────────────────────────────────────────────────
  private async processJob(job: any): Promise<void> {
    const { videoId } = job.data;
    const log = (msg: string) =>
      this.logger.log(`[${videoId.slice(-8)}] ${msg}`);

    log('Cleanup started');

    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      log('Video record already gone — skipping');
      return;
    }

    // Only hard-delete if soft-deleted, otherwise skip
    if (!video.deletedAt) {
      log('Video not soft-deleted yet — skipping');
      return;
    }

    const videoIdShort = videoId.slice(-8);

    // 1. Delete video output directory
    const outputDir = join(this.OUTPUT_DIR, videoIdShort);
    try {
      if (existsSync(outputDir)) {
        rmSync(outputDir, { recursive: true, force: true });
        log(`Deleted output dir: ${outputDir}`);
      }
    } catch (e: any) {
      log(`Failed to delete output dir: ${e.message}`);
    }

    // 2. Hard-delete Video record from DB
    try {
      await this.prisma.video.delete({ where: { id: videoId } });
      log('Video record hard-deleted from DB');
    } catch (e: any) {
      log(`Failed to hard-delete video record: ${e.message}`);
    }

    log('Cleanup complete');
  }

  // ── Temp file cleanup: run on startup + every hour ────────────────────────
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupStaleTempFiles(): Promise<void> {
    this.logger.log('[TempCleanup] Starting stale temp files cleanup...');
    await this.cleanupTempFiles();
  }

  async cleanupTempFiles(): Promise<void> {
    if (!existsSync(this.TEMP_DIR)) return;

    const now = Date.now();
    let deletedCount = 0;
    let errorCount = 0;

    try {
      const files = readdirSync(this.TEMP_DIR);
      for (const file of files) {
        const filePath = join(this.TEMP_DIR, file);
        try {
          const { existsSync: fsExists, statSync } = require('fs');
          if (!fsExists(filePath)) continue;
          const stat = statSync(filePath);
          if (now - stat.mtimeMs > this.TEMP_MAX_AGE_MS) {
            rmSync(filePath, { force: true });
            deletedCount++;
          }
        } catch (e: any) {
          errorCount++;
          this.logger.warn(`[TempCleanup] Failed to process ${file}: ${e.message}`);
        }
      }
    } catch (e: any) {
      this.logger.error(`[TempCleanup] Failed to read temp dir: ${e.message}`);
    }

    this.logger.log(
      `[TempCleanup] Done — deleted: ${deletedCount}, errors: ${errorCount}`,
    );
  }
}