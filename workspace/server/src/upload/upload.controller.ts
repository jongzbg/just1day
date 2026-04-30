import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
          return callback(new BadRequestException('Only image/video files are allowed'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const url = await this.uploadService.saveFile(file);
    return { url };
  }
}
