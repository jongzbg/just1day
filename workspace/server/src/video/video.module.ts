import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { VideoProcessor } from './video.processor';
import { VideoNotificationGateway } from './video-notification.gateway';
import { VideoCleanupService } from './video-cleanup.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-token',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [VideoController],
  providers: [
    VideoService,
    VideoProcessor,
    VideoCleanupService,
    VideoNotificationGateway,
    PrismaService,
  ],
  exports: [VideoService, VideoCleanupService],
})
export class VideoModule implements OnModuleInit {
  constructor(
    private processor: VideoProcessor,
    private service: VideoService,
  ) {
    console.log('[VideoModule] Constructor called');
  }

  onModuleInit() {
    console.log('[VideoModule] onModuleInit called');
  }
}
