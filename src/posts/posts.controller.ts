import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto, SearchPostsDto } from './dto/posts.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async create(@Body() post: CreatePostDto) {
    const createdPost = await this.postsService.create(post);
    return { postId: createdPost.id };
  }

  @Get(':id')
  async get(@Param('id') id: number) {
    const post = await this.postsService.findById(id);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  @Get()
  async search(@Query() filters: SearchPostsDto) {
    return this.postsService.search(filters);
  }
}
