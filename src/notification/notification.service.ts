import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Idea } from 'src/ideas/entities/idea.entity';
import { NotificationGateway } from './notification.gateway';
import { Notification as NotificationEntity, NotificationType } from './notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Idea)
    private readonly ideaRepo: Repository<Idea>,
    @InjectRepository(NotificationEntity)
    private readonly notifRepo: Repository<NotificationEntity>,
    private readonly gateway: NotificationGateway,
  ) {}

  private async getAuthorId(ideaId: number): Promise<number | null> {
    const idea = await this.ideaRepo.findOne({
      where: { id: ideaId },
      relations: ['author'],
      select: { id: true, author: { id: true } as any },
    });
    return idea?.author?.id ?? null;
  }

  private async createAndEmit(userId: number, payload: {
    type: NotificationType;
    ideaId: number;
    message: string;
    parentCommentId?: number;
  }) {
    // Persist
    const entity = this.notifRepo.create({
      user: { id: userId } as any,
      type: payload.type,
      ideaId: payload.ideaId,
      parentId: payload.parentCommentId ?? null,
      message: payload.message,
    });
    await this.notifRepo.save(entity);

    // Emit realtime
    this.gateway.notifyUser(userId, 'notification', {
      type: payload.type,
      ideaId: payload.ideaId,
      parentCommentId: payload.parentCommentId,
      message: payload.message,
      at: new Date().toISOString(),
      id: entity.id,
      read: false,
    });
  }

  // Event handlers
  @OnEvent('idea.commented')
  async handleIdeaCommentedEvent(payload: { ideaId: number; username: string; userId?: number }) {
    const authorId = await this.getAuthorId(payload.ideaId);
    if (!authorId) return;
    if (payload.userId && payload.userId === authorId) return; // avoid self-notify
    await this.createAndEmit(authorId, {
      type: 'comment',
      ideaId: payload.ideaId,
      message: `New comment on your idea by ${payload.username}`,
    });
  }

  @OnEvent('idea.upvoted')
  async handleIdeaUpvotedEvent(payload: { ideaId: number; username: string; userId?: number }) {
    const authorId = await this.getAuthorId(payload.ideaId);
    if (!authorId) return;
    if (payload.userId && payload.userId === authorId) return;
    await this.createAndEmit(authorId, {
      type: 'upvote',
      ideaId: payload.ideaId,
      message: `${payload.username} liked your idea`,
    });
  }

  @OnEvent('idea.downvoted')
  async handleIdeaDownvotedEvent(payload: { ideaId: number; username: string; userId?: number }) {
    const authorId = await this.getAuthorId(payload.ideaId);
    if (!authorId) return;
    if (payload.userId && payload.userId === authorId) return;
    await this.createAndEmit(authorId, {
      type: 'downvote',
      ideaId: payload.ideaId,
      message: `${payload.username} disliked your idea`,
    });
  }

  @OnEvent('idea.shared')
  async handleIdeaSharedEvent(payload: { ideaId: number; username: string; userId?: number }) {
    const authorId = await this.getAuthorId(payload.ideaId);
    if (!authorId) return;
    if (payload.userId && payload.userId === authorId) return;
    await this.createAndEmit(authorId, {
      type: 'share',
      ideaId: payload.ideaId,
      message: `${payload.username} shared your idea`,
    });
  }

  @OnEvent('comment.replied')
  async handleCommentRepliedEvent(payload: { ideaId: number; parentCommentId: number; parentAuthorId: number; username: string; userId: number }) {
    if (!payload?.parentAuthorId) return;
    if (payload.userId === payload.parentAuthorId) return;
    await this.createAndEmit(payload.parentAuthorId, {
      type: 'reply',
      ideaId: payload.ideaId,
      parentCommentId: payload.parentCommentId,
      message: `${payload.username} replied to your comment`,
    });
  }

  // REST support methods
  async list(userId: number, opts: { onlyUnread: boolean; limit: number; skip: number }) {
    const qb = this.notifRepo.createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC')
      .take(opts.limit)
      .skip(opts.skip);

    if (opts.onlyUnread) {
      qb.andWhere('n.read = :read', { read: false });
    }

    const items = await qb.getMany();
    return {
      items,
      pageInfo: { nextSkip: opts.skip + items.length, hasMore: items.length === opts.limit },
    };
    // Note: For accurate hasMore, you could also query total count.
  }

  async markRead(userId: number, id: number) {
    const res = await this.notifRepo.update({ id, user: { id: userId } as any }, { read: true });
    // Optionally return not found if affected === 0
    return res.affected ?? 0;
  }

  async markAllRead(userId: number) {
    const res = await this.notifRepo.createQueryBuilder()
      .update(NotificationEntity)
      .set({ read: true })
      .where('userId = :userId', { userId })
      .andWhere('read = :read', { read: false })
      .execute();
    return res.affected ?? 0;
  }

  async deleteOne(userId: number, id: number) {
    await this.notifRepo.delete({ id, user: { id: userId } as any });
  }
}