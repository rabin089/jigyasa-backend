import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  private users: User[] = [];
  private idCounter = 1;

  create(createUserDto: CreateUserDto): User {
   const newUser: User = {
     id: this.idCounter++,
     ...createUserDto,
     createdAt :new Date(),
     role: 'user',
     username: '',
     name: '',
     ideas: [],
   };
    this.users.push(newUser);
    return newUser;
  }

  findAll(): User[] {
    return this.users;
  }

  findOne(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  update(id: number, updateUserDto: UpdateUserDto): User {
    const user = this.findOne(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    Object.assign(user, updateUserDto);
    return user;
  }

  remove(id: number): void {
    this.users = this.users.filter(user => user.id !== id);
  }
}
