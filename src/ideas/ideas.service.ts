import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaDto } from './dto/update-idea.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Idea } from './entities/idea.entity';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { IdeaVersion } from 'src/idea-version/entities/idea-version.entity';
import { IdeaReaction } from './entities/idea-reaction.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class IdeasService {

  constructor(
    @InjectRepository(Idea)
    private readonly ideaRepository: Repository<Idea>,
    @InjectRepository(IdeaVersion)
    private readonly ideaVersionRepository: Repository<IdeaVersion>,
    @InjectRepository(IdeaReaction)
    private readonly reactionRepository: Repository<IdeaReaction>,

    private eventemitter: EventEmitter2,
  ){}

  // Simple in-memory cache with TTL
  private topCache: Map<string, { expires: number; data: any } > = new Map();
  private ideaScoreCache: Map<number, { expires: number; data: { score: number; up: number; down: number } }> = new Map();
  private readonly DEFAULT_TTL_MS = 10_000;

  private getCachedTop(key: string) {
    const entry = this.topCache.get(key);
    if (entry && entry.expires > Date.now()) return entry.data;
    if (entry) this.topCache.delete(key);
    return null;
  }
  private setCachedTop(key: string, data: any, ttl = this.DEFAULT_TTL_MS) {
    this.topCache.set(key, { expires: Date.now() + ttl, data });
  }
  private invalidateTopCache() {
    this.topCache.clear();
  }

  private getCachedIdeaScore(id: number) {
    const entry = this.ideaScoreCache.get(id);
    if (entry && entry.expires > Date.now()) return entry.data;
    if (entry) this.ideaScoreCache.delete(id);
    return null;
  }
  private setCachedIdeaScore(id: number, data: { score: number; up: number; down: number }, ttl = this.DEFAULT_TTL_MS) {
    this.ideaScoreCache.set(id, { expires: Date.now() + ttl, data });
  }
  private invalidateIdeaScore(id: number) {
    this.ideaScoreCache.delete(id);
  }
  
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
      imageUrl: (createIdeaDto as any).imageUrl,
      category: (createIdeaDto as any).category,
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

  // Get reaction aggregates for an idea
  async getIdeaScore(ideaId: number): Promise<{ score: number; up: number; down: number }> {
    const cached = this.getCachedIdeaScore(ideaId);
    if (cached) return cached;

    const qb = this.reactionRepository
      .createQueryBuilder('r')
      .select('SUM(r.value)', 'score')
      .addSelect("SUM(CASE WHEN r.value = 1 THEN 1 ELSE 0 END)", 'up')
      .addSelect("SUM(CASE WHEN r.value = -1 THEN 1 ELSE 0 END)", 'down')
      .where('r.ideaId = :ideaId', { ideaId });

    const raw = await qb.getRawOne<{ score: string | null; up: string | null; down: string | null }>();
    const data = {
      score: raw?.score ? Number(raw.score) : 0,
      up: raw?.up ? Number(raw.up) : 0,
      down: raw?.down ? Number(raw.down) : 0,
    };
    this.setCachedIdeaScore(ideaId, data);
    return data;
  }

  // Toggle or set a reaction
  async react(ideaId: number, user: User, value: 1 | -1): Promise<{ ideaId: number; value: 1 | 0 | -1; aggregates: { score: number; up: number; down: number } }> {
    const idea = await this.ideaRepository.findOne({ where: { id: ideaId }, select: { id: true } });
    if (!idea) throw new NotFoundException('Idea not found');
    if (!user) throw new ForbiddenException('You must be logged in to react');

    let reaction = await this.reactionRepository.findOne({ where: { idea: { id: ideaId }, user: { id: user.id } }, relations: ['idea', 'user'] });

    // If same value exists, toggle off (remove reaction)
    if (reaction && reaction.value === value) {
      await this.reactionRepository.remove(reaction);
      this.invalidateIdeaScore(ideaId);
      this.invalidateTopCache();
      const aggregates = await this.getIdeaScore(ideaId);
      return { ideaId, value: 0, aggregates };
    }

    if (!reaction) {
      reaction = this.reactionRepository.create({ idea, user, value });
    } else {
      reaction.value = value;
    }
    await this.reactionRepository.save(reaction);

    // Invalidate caches
    this.invalidateIdeaScore(ideaId);
    this.invalidateTopCache();

    const aggregates = await this.getIdeaScore(ideaId);
    if (value === 1) {
      this.eventemitter.emit('idea.upvoted', { ideaId, username: user.name, userId: user.id });
    } else if (value === -1) {
      this.eventemitter.emit('idea.downvoted', { ideaId, username: user.name, userId: user.id });
    }
    return { ideaId, value, aggregates };
  }

  // Top-rated ideas by score (sum of reactions)
  async topRated(limit = 10): Promise<Array<{ id: number; title: string; description: string; authorId: number; createdAt: Date; updatedAt: Date; score: number; up: number; down: number }>> {
    const cacheKey = `top:${limit}`;
    const cached = this.getCachedTop(cacheKey);
    if (cached) return cached;

    const qb = this.ideaRepository
      .createQueryBuilder('idea')
      .leftJoin('idea.author', 'author')
      .leftJoin(IdeaReaction, 'r', 'r.ideaId = idea.id')
      .select([
        'idea.id as id',
        'idea.title as title',
        'idea.description as description',
        'idea.createdAt as createdAt',
        'idea.updatedAt as updatedAt',
        'author.id as authorId',
      ])
      .addSelect('COALESCE(SUM(r.value), 0)', 'score')
      .addSelect("COALESCE(SUM(CASE WHEN r.value = 1 THEN 1 ELSE 0 END), 0)", 'up')
      .addSelect("COALESCE(SUM(CASE WHEN r.value = -1 THEN 1 ELSE 0 END), 0)", 'down')
      .groupBy('idea.id')
      .addGroupBy('author.id')
      .orderBy('score', 'DESC')
      .addOrderBy('idea.createdAt', 'DESC')
      .limit(limit);

    const rows = await qb.getRawMany<{
      id: number;
      title: string;
      description: string;
      createdAt: Date;
      updatedAt: Date;
      authorId: number;
      score: string;
      up: string;
      down: string;
    }>();

    const data = rows.map(r => ({
      id: Number(r.id),
      title: r.title,
      description: r.description,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      authorId: Number(r.authorId),
      score: r.score ? Number(r.score) : 0,
      up: r.up ? Number(r.up) : 0,
      down: r.down ? Number(r.down) : 0,
    }));

    this.setCachedTop(cacheKey, data);
    return data;
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
