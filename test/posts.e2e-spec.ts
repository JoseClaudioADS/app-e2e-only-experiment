import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DatabaseModule } from '../src/database/database.module';
import { createUser } from './factories/user.factory';
import { PrismaService } from '../src/database/prisma.service';
import { createPost, generatePost, savePost } from './factories/post.factory';
import { PostsModule } from '../src/posts/posts.module';

const userCreateMock = jest.fn();

const postCreateMock = jest.fn();
const postFindUniqueMock = jest.fn();
const postFindManyMock = jest.fn();

jest.mock('@prisma/client', () => {
  const requireOriginal = jest.requireActual('@prisma/client');

  return process.argv.some((arg) => arg === '-disable-mock')
    ? requireOriginal
    : {
        $connect: jest.fn(),
        PrismaClient: jest.fn().mockImplementation(() => ({
          user: {
            create: userCreateMock,
            deleteMany: jest.fn(),
          },
          post: {
            create: postCreateMock,
            findUnique: postFindUniqueMock,
            findMany: postFindManyMock,
            deleteMany: jest.fn(),
          },
        })),
      };
});

describe('Posts', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    await prismaService.post.deleteMany({});
    await prismaService.user.deleteMany({});
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PostsModule, DatabaseModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );
    prismaService = moduleRef.get(PrismaService);
    await app.init();
  });

  describe('POST /posts', () => {
    it(`should create a post`, async () => {
      const author = await createUser(prismaService);
      const post = generatePost(author.id, false, false);
      postCreateMock.mockResolvedValueOnce({ ...post, id: 1 });

      const postCreateSpy = jest.spyOn(prismaService.post, 'create');

      return request(app.getHttpServer())
        .post('/posts')
        .send(post)
        .expect(201)
        .expect((response) => {
          expect(response.body).toEqual({ postId: expect.any(Number) });

          expect(postCreateSpy).toHaveBeenCalledWith({
            data: post,
          });
        });
    });

    it(`should not create a post if the payload is invalid`, async () => {
      const postCreateSpy = jest.spyOn(prismaService.post, 'create');

      return request(app.getHttpServer())
        .post('/posts')
        .send({})
        .expect(400)
        .expect(() => {
          expect(postCreateSpy).not.toHaveBeenCalled();
        });
    });
  });

  describe('GET /posts/:id', () => {
    it(`should get a post by id`, async () => {
      const author = await createUser(prismaService);
      const post = await createPost(prismaService, author.id);

      postFindUniqueMock.mockResolvedValueOnce(post);

      const postFindUniqueSpy = jest.spyOn(prismaService.post, 'findUnique');

      return request(app.getHttpServer())
        .get(`/posts/${post.id}`)
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual(post);

          expect(postFindUniqueSpy).toHaveBeenCalledWith({
            where: { id: post.id },
          });
        });
    });

    it(`should return 404 if the post does not exist`, async () => {
      const postFindUniqueSpy = jest.spyOn(prismaService.post, 'findUnique');

      return request(app.getHttpServer())
        .get(`/posts/100`)
        .expect(404)
        .expect((response) => {
          expect(response.body).toMatchObject({
            statusCode: 404,
          });

          expect(postFindUniqueSpy).toHaveBeenCalledWith({
            where: { id: 100 },
          });
        });
    });
  });

  describe('GET /posts', () => {
    it(`should filter posts by search term`, async () => {
      const author = await createUser(prismaService);
      const post1 = generatePost(author.id, true);
      post1.title = 'Post 1 should-return';
      const post2 = generatePost(author.id, true);
      post2.title = 'Post 2';
      post2.content = 'Post 2 content should-return';
      const post3 = generatePost(author.id, true);

      await savePost(prismaService, post1);
      await savePost(prismaService, post2);
      await savePost(prismaService, post3);

      postFindManyMock.mockResolvedValueOnce([post1, post2]);

      const postFindManySpy = jest.spyOn(prismaService.post, 'findMany');

      return request(app.getHttpServer())
        .get(`/posts`)
        .query({ q: 'should-return' })
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual([post1, post2]);

          expect(postFindManySpy).toHaveBeenCalledWith({
            where: {
              OR: [
                { title: { contains: 'should-return', mode: 'insensitive' } },
                { content: { contains: 'should-return', mode: 'insensitive' } },
              ],
            },
          });
        });
    });

    it(`should filter posts by author id`, async () => {
      const author1 = await createUser(prismaService);
      const author2 = await createUser(prismaService);
      const post1 = await createPost(prismaService, author1.id, true);
      await createPost(prismaService, author2.id, true);
      const post3 = await createPost(prismaService, author1.id, true);

      postFindManyMock.mockResolvedValueOnce([post1, post3]);

      const postFindManySpy = jest.spyOn(prismaService.post, 'findMany');

      return request(app.getHttpServer())
        .get(`/posts`)
        .query({ authorId: author1.id })
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual([post1, post3]);

          expect(postFindManySpy).toHaveBeenCalledWith({
            where: {
              authorId: author1.id,
            },
          });
        });
    });

    it(`should filter posts by published status`, async () => {
      const author = await createUser(prismaService);
      const post1 = await createPost(prismaService, author.id, true);
      await createPost(prismaService, author.id, false);
      await createPost(prismaService, author.id, false);

      postFindManyMock.mockResolvedValueOnce([post1]);

      const postFindManySpy = jest.spyOn(prismaService.post, 'findMany');

      return request(app.getHttpServer())
        .get(`/posts`)
        .query({ published: true })
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual([post1]);

          expect(postFindManySpy).toHaveBeenCalledWith({
            where: {
              published: true,
            },
          });
        });
    });

    it(`should filter posts by a mix of search term, author id, and published status`, async () => {
      const author1 = await createUser(prismaService);
      const author2 = await createUser(prismaService);
      const post1 = generatePost(author1.id, true);
      post1.title = 'Post 1 should-return';
      await savePost(prismaService, post1);
      await createPost(prismaService, author1.id, true);
      await createPost(prismaService, author2.id, false);

      postFindManyMock.mockResolvedValueOnce([post1]);

      const postFindManySpy = jest.spyOn(prismaService.post, 'findMany');

      return request(app.getHttpServer())
        .get(`/posts`)
        .query({ q: 'should-return', authorId: author1.id, published: true })
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual([post1]);

          expect(postFindManySpy).toHaveBeenCalledWith({
            where: {
              OR: [
                { title: { contains: 'should-return', mode: 'insensitive' } },
                { content: { contains: 'should-return', mode: 'insensitive' } },
              ],
              authorId: author1.id,
              published: true,
            },
          });
        });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
