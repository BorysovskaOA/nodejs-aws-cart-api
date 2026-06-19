import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findOne(name: string): Promise<User> {
    return this.userRepository.findOne({ where: { name: name } });
  }

  async createOne({ name, email, password }: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create({
      id: randomUUID(),
      name,
      email,
      password,
    });

    return await this.userRepository.save(newUser);
  }
}
