import { IsNotEmpty, IsOptional, IsString, IsArray, IsUrl } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  mediaUrls?: string[];
}
