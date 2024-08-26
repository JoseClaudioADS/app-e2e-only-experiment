import { Injectable } from '@nestjs/common';
import { PostsRepository } from './posts.repository';
import { CreatePostDto, SearchPostsDto } from './dto/posts.dto';

@Injectable()
export class PostsService {
  constructor(private readonly postsRepository: PostsRepository) {}

  async create(post: CreatePostDto) {
    const postDto = {
      ...post,
      published: false,
    };
    return this.postsRepository.create(postDto);
  }

  async findById(id: number) {
    return this.postsRepository.findById(id);
  }

  async search(filters: SearchPostsDto) {
    return this.postsRepository.search(filters);
  }
}
