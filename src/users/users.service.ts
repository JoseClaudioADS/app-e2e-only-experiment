import { ConflictException, Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findAll() {
    return this.usersRepository.findAll();
  }

  async create(user: CreateUserDto) {
    const userExists = await this.usersRepository.findByEmail(user.email);

    if (userExists) {
      throw new ConflictException('User already exists');
    }

    const createdUser = await this.usersRepository.create(user);
    return createdUser.id;
  }
}
