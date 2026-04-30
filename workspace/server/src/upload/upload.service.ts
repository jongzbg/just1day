import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File, baseUrl?: string): Promise<string> {
    this.ensureUploadDir();
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filepath = path.join(this.uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);
    const host = baseUrl || `http://localhost:3001`;
    return `${host}/uploads/${filename}`;
  }
}
