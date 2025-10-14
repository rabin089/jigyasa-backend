import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaDto } from './dto/update-idea.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Idea } from './entities/idea.entity';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { IdeaVersion } from 'src/idea-version/entities/idea-version.entity';

@Injectable()
export class IdeasService {

  constructor(
    @InjectRepository(Idea)
    private readonly ideaRepository: Repository<Idea>,
    @InjectRepository(IdeaVersion)
    private readonly ideaVersionRepository: Repository<IdeaVersion>,
  ){}
  
  async create(createIdeaDto: CreateIdeaDto, user: User): Promise<Idea> {
    console.log('=== IDEAS SERVICE - CREATE ===');
    console.log('Input DTO:', createIdeaDto);
    console.log('User creating idea:', user);
    console.log('============================');

    if (!user) {
      throw new ForbiddenException('You must be logged in to create an idea');
    }

    const idea = this.ideaRepository.create({
      title: createIdeaDto.title,
      description: createIdeaDto.description,
      author: user,
    });

    console.log('Created idea object:', idea);

    const savedIdea = await this.ideaRepository.save(idea);

    // Create initial version (version 1)
    const v1 = this.ideaVersionRepository.create({
      idea: savedIdea,
      user,
      title: savedIdea.title,
      description: savedIdea.description,
      version: 1,
      parentVersion: null,
    });
    await this.ideaVersionRepository.save(v1);
    console.log('Saved idea from DB:', savedIdea);
    console.log('============================');

    return savedIdea;
  }

  async findAll(page: number, limit:number=10): Promise<{data: Idea[], total:number}> {
    const [data, total] = await this.ideaRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      order: {
        createdAt: 'DESC'
      },
      relations: ['author'],
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        author: {
          id: true,
          name: true,
        }
      }
    })
    return {data, total}
  }

  async findOne(id: number): Promise<Idea> {
    const idea = await this.ideaRepository.findOne({
      where: {id},
      relations: ['author'],
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        author: {
          id: true,
          name: true,
        }
      }
    });
    if(!idea){
      throw new NotFoundException("Idea not found")
    }
    return idea;
  }

  async update(id: number, updateIdeaDto: UpdateIdeaDto, user: User): Promise<Idea> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['author'],
      select: {
        id: true,
        title: true,
        description: true,
        currentVersion: true,
        createdAt: true,
        updatedAt: true,
        author: {
          id: true,
          name: true,
        }
      }
    });
    if (!idea) throw new NotFoundException('Idea not found');

    // Authorization barrier: only author can update
    if (idea.author.id !== user.id) {
      throw new ForbiddenException('You are not allowed to update this idea');
    }

    // Calculate next version
    const nextVersion = (idea.currentVersion || 1) + 1;

    // Apply updates to the idea (latest snapshot)
    Object.assign(idea, updateIdeaDto);
    idea.currentVersion = nextVersion;
    const saved = await this.ideaRepository.save(idea);

    // Create a new version record capturing the new state
    const version = this.ideaVersionRepository.create({
      idea: saved,
      user,
      title: saved.title,
      description: saved.description,
      version: nextVersion,
      parentVersion: nextVersion - 1,
    });
    await this.ideaVersionRepository.save(version);

    return saved;
  }

  // List all versions for an idea (newest first)
  async listVersions(ideaId: number) {
    const idea = await this.ideaRepository.findOne({ where: { id: ideaId } });
    if (!idea) throw new NotFoundException('Idea not found');
    const versions = await this.ideaVersionRepository.find({
      where: { idea: { id: ideaId } },
      order: { version: 'DESC' },
      relations: ['user'],
    });
    return { ideaId, currentVersion: idea.currentVersion, versions };
  }

  // Get a specific version snapshot
  async getVersion(ideaId: number, version: number) {
    const snap = await this.ideaVersionRepository.findOne({
      where: { idea: { id: ideaId }, version },
      relations: ['user', 'idea'],
    });
    if (!snap) throw new NotFoundException('Version not found');
    return snap;
  }

  // Restore a version (creates a new current version from the snapshot)
  async restoreVersion(ideaId: number, version: number, user: User) {
    const idea = await this.ideaRepository.findOne({
      where: { id: ideaId },
      relations: ['author'],
      select: { id: true, title: true, description: true, currentVersion: true, author: { id: true } },
    });
    if (!idea) throw new NotFoundException('Idea not found');
    if (idea.author.id !== user.id) {
      throw new ForbiddenException('You are not allowed to restore this idea');
    }

    const snap = await this.ideaVersionRepository.findOne({ where: { idea: { id: ideaId }, version } });
    if (!snap) throw new NotFoundException('Version not found');

    const nextVersion = (idea.currentVersion || 1) + 1;
    idea.title = snap.title;
    idea.description = snap.description;
    idea.currentVersion = nextVersion;
    const saved = await this.ideaRepository.save(idea);

    const newSnap = this.ideaVersionRepository.create({
      idea: saved,
      user,
      title: saved.title,
      description: saved.description,
      version: nextVersion,
      parentVersion: version,
    });
    await this.ideaVersionRepository.save(newSnap);

    return saved;
  }
  async remove(id: number, user: User): Promise<void> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ['author'],
      select: {
        id: true,
        author: {
          id: true
        }
      }
    });
    if (!idea) throw new NotFoundException('Idea not found');

    // Authorization barrier: only author can delete
    if (idea.author.id !== user.id) {
      throw new ForbiddenException('You are not allowed to delete this idea');
    }

    await this.ideaRepository.delete(id);
  }

  // Fetch ideas authored by the given user
  async findMine(userId: number, page = 1, limit = 10): Promise<{ data: Idea[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.ideaRepository.findAndCount({
      where: { author: { id: userId } },
      take: limit,
      skip: (page - 1) * limit,
      order: { createdAt: 'DESC' },
      relations: ['author'],
      select: {
        id: true,
        title: true,
        description: true,
        currentVersion: true,
        createdAt: true,
        updatedAt: true,
        author: { id: true, name: true },
      },
    });
    return { data, total, page, limit };
  }

  // Fetch ideas the user has contributed to (commented or created versions)
  async findContributed(userId: number, page = 1, limit = 10): Promise<{ data: Idea[]; total: number; page: number; limit: number }> {
    const qb = this.ideaRepository
      .createQueryBuilder('idea')
      .leftJoin('idea.comments', 'comment')
      .leftJoin('idea.versions', 'version')
      .leftJoin('idea.author', 'author')
      .where('comment.authorId = :userId OR version.userId = :userId', { userId })
      .distinct(true)
      .orderBy('idea.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .select([
        'idea.id',
        'idea.title',
        'idea.description',
        'idea.currentVersion',
        'idea.createdAt',
        'idea.updatedAt',
        'author.id',
        'author.name',
      ]);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

}
