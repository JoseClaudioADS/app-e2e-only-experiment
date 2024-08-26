import { faker } from '@faker-js/faker';
import { PrismaClient, Post } from '@prisma/client';

export const generatePost = (
  authorId: number,
  published = true,
  withId = true,
) => ({
  id: withId ? faker.number.int(1000) : undefined,
  title: faker.lorem.sentence(3),
  content: faker.lorem.lines(2),
  authorId,
  published,
});

export const savePost = async (prisma: PrismaClient, post: Post) => {
  return prisma.post.create({ data: post });
};

export const createPost = async (
  prisma: PrismaClient,
  authorId: number,
  published = true,
  post?: Post,
) => {
  const postData = post || generatePost(authorId, published);
  await savePost(prisma, postData);

  return postData;
};
