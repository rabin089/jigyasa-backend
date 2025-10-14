import { Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/comment.dto';
import { User } from 'src/user/entities/user.entity';
import { Comment } from './entities/comment.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Idea } from 'src/ideas/entities/idea.entity';

@Injectable()
export class CommentService {

    constructor(
        @InjectRepository(Comment)
        private readonly commentRepository: Repository<Comment>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Idea)
        private readonly ideaRepository: Repository<Idea>,
      ) {}
    
      // Add comment to an idea
  async addComment(ideaId: number, createDto: CreateCommentDto, user: User) {
  const idea = await this.ideaRepository.findOne({ where: { id: ideaId } });
  if (!idea) throw new NotFoundException('Idea not found');

  let parentComment: Comment | null = null;
  if (createDto.parentId) {
    parentComment = await this.commentRepository.findOne({
      where: { id: createDto.parentId },
      relations: ['idea'],
    });
    if (!parentComment) throw new NotFoundException('Parent comment not found');
    if (parentComment.idea.id !== ideaId) {
      throw new NotFoundException('Parent comment does not belong to this idea');
    }
  }

  const comment = this.commentRepository.create({
    content: createDto.content,
    author: user,
    idea,
    parent: parentComment || undefined,
  });

  return this.commentRepository.save(comment);
}

// Find all comments by idea ID
async findAllCommentsByIdea(ideaId: number): Promise<Comment[]>{
  const idea = await this.ideaRepository.findOne({where:{id: ideaId}});
  if(!idea){
    throw new NotFoundException('Idea not found');

  }
  const comment = await this.commentRepository.find({
    where: {idea:{id:ideaId}},
    relations:['author','parent'],
    order:{createdAt:'ASC'}
  })
  return comment;
}

  // Build nested tree from flat array (return plain objects to avoid class method typing)
  private buildCommentTree(comments: Comment[]): any[] {
    const map = new Map<number, any>();
    const roots: any[] = [];

    comments.forEach((c) => {
      map.set(c.id, {
        id: c.id,
        content: c.content,
        externalId: (c as any).externalId ?? null,
        author: c.author,
        idea: c.idea,
        parent: c.parent ?? null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        children: [],
      });
    });

    comments.forEach((c) => {
      const node = map.get(c.id)!;
      if (c.parent) {
        const parent = map.get(c.parent.id);
        if (parent) parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async getNestedCommentsByIdea(ideaId: number): Promise<any[]> {
    const flat = await this.findAllCommentsByIdea(ideaId);
    if (flat.length === 0) return [];
    return this.buildCommentTree(flat);
  }

  //  reply to a comment by parentId
  async replyToComment(parentId: number, content: string, user: User): Promise<Comment> {
    const parent = await this.commentRepository.findOne({
      where: { id: parentId },
      relations: ['idea'],
    });
    if (!parent) throw new NotFoundException('Parent comment not found');

    const comment = this.commentRepository.create({
      content,
      author: user,
      idea: parent.idea,
      parent,
    });
    return this.commentRepository.save(comment);
  }

  //  get top-level threads with reply preview and counts
  async getThreads(ideaId: number, limit = 10, skip = 0) {
    const idea = await this.ideaRepository.findOne({ where: { id: ideaId } });
    if (!idea) throw new NotFoundException('Idea not found');

    const threads = await this.commentRepository.find({
      where: { idea: { id: ideaId }, parent: null as any },
      relations: ['author'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    const items = await Promise.all(
      threads.map(async (t) => {
        const replyCount = await this.commentRepository.count({ where: { parent: { id: t.id } } });
        const replyPreview = await this.commentRepository.find({
          where: { parent: { id: t.id } },
          relations: ['author'],
          order: { createdAt: 'DESC' },
          take: 2,
        });
        return { ...t, replyCount, replyPreview };
      })
    );

    return {
      items,
      pageInfo: { nextSkip: skip + threads.length, hasMore: threads.length === limit },
    };
  }

  // get replies for a specific parent (paginated)
  async getReplies(parentId: number, limit = 10, skip = 0) {
    const parent = await this.commentRepository.findOne({ where: { id: parentId } });
    if (!parent) throw new NotFoundException('Parent comment not found');

    const replyCount = await this.commentRepository.count({ where: { parent: { id: parentId } } });
    const items = await this.commentRepository.find({
      where: { parent: { id: parentId } },
      relations: ['author'],
      order: { createdAt: 'ASC' },
      take: limit,
      skip,
    });

    return {
      parentId,
      replyCount,
      items,
      pageInfo: { nextSkip: skip + items.length, hasMore: items.length === limit },
    };
  }

}
