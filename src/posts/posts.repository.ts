import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SearchPostsDto } from './dto/posts.dto';

export type CreatePost = {
  title: string;
  content?: string;
  published: boolean;
  authorId: number;
};

@Injectable()
export class PostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(post: CreatePost) {
    return this.prisma.post.create({ data: post });
  }

  findById(id: number) {
    return this.prisma.post.findUnique({ where: { id } });
  }

  search(filters: SearchPostsDto) {
    return this.prisma.post.findMany({
      where: {
        ...(filters.q && {
          OR: [
            { title: { contains: filters.q, mode: 'insensitive' } },
            { content: { contains: filters.q, mode: 'insensitive' } },
          ],
        }),
        ...(filters.authorId && {
          authorId: filters.authorId,
        }),
        ...(filters.published !== undefined && {
          published: filters.published,
        }),
      },
    });
  }
}
