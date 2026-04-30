import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];
}
