import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { UsersModule } from '../src/users/users.module';
import { DatabaseModule } from '../src/database/database.module';
import { createUser, generateUser } from './factories/user.factory';
import { PrismaService } from '../src/database/prisma.service';

const userFindManyMock = jest.fn();
const userFindUniqueMock = jest.fn();
const userCreateMock = jest.fn();

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
            findMany: userFindManyMock,
            findUnique: userFindUniqueMock,
          },
        })),
      };
});

describe('Users', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    await prismaService.user.deleteMany({});
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [UsersModule, DatabaseModule],
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

  describe('POST /users', () => {
    it(`should create a user`, async () => {
      const user = generateUser(false);
      userCreateMock.mockResolvedValueOnce({ ...user, id: 1 });

      const userCreateSpy = jest.spyOn(prismaService.user, 'create');

      return request(app.getHttpServer())
        .post('/users')
        .send(user)
        .expect(201)
        .expect((response) => {
          expect(response.body).toEqual({ userId: expect.any(Number) });

          expect(userCreateSpy).toHaveBeenCalledWith({
            data: user,
          });
        });
    });

    it(`should not create a user if the email is already used`, async () => {
      const user = await createUser(prismaService);
      userFindUniqueMock.mockResolvedValueOnce(user);

      const userCreateSpy = jest.spyOn(prismaService.user, 'create');
      userCreateSpy.mockClear();

      return request(app.getHttpServer())
        .post('/users')
        .send(user)
        .expect(409)
        .expect(() => {
          expect(userCreateSpy).not.toHaveBeenCalled();
        });
    });

    it(`should not create a user if the payload is invalid`, async () => {
      const userCreateSpy = jest.spyOn(prismaService.user, 'create');

      return request(app.getHttpServer())
        .post('/users')
        .send({})
        .expect(400)
        .expect(() => {
          expect(userCreateSpy).not.toHaveBeenCalled();
        });
    });

    it(`should not create a user if the e-mail is invalid`, async () => {
      const userCreateSpy = jest.spyOn(prismaService.user, 'create');

      return request(app.getHttpServer())
        .post('/users')
        .send({ name: 'John Doe', email: 'invalid-email' })
        .expect(400)
        .expect(() => {
          expect(userCreateSpy).not.toHaveBeenCalled();
        });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
