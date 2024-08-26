import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsPositive, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @MaxLength(255)
  content: string;

  @IsOptional()
  @IsPositive()
  authorId: number;
}

export class SearchPostsDto {
  @IsOptional()
  @IsNotEmpty()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  authorId?: number;

  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => {
    return value === 'true';
  })
  published?: boolean;
}
