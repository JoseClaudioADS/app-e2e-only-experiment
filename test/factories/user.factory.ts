import { faker } from '@faker-js/faker';
import { PrismaClient, User } from '@prisma/client';

export const generateUser = (withId = true) => ({
  id: withId ? faker.number.int(1000) : undefined,
  name: faker.person.fullName(),
  email: faker.internet.email(),
});

export const saveUser = async (prisma: PrismaClient, user: User) => {
  return prisma.user.create({ data: user });
};

export const createUser = async (prisma: PrismaClient, user?: User) => {
  const userData = user || generateUser();
  await saveUser(prisma, userData);

  return userData;
};
