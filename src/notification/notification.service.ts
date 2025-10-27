import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Idea } from 'src/ideas/entities/idea.entity';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Idea)
    private readonly ideaRepo: Repository<Idea>,
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

  @OnEvent('idea.commented')
  async handleIdeaCommentedEvent(payload: { ideaId: number; username: string; userId?: number }) {
    const authorId = await this.getAuthorId(payload.ideaId);
    if (!authorId) return;
    if (payload.userId && payload.userId === authorId) return; // avoid self-notify
    this.gateway.notifyUser(authorId, 'notification', {
      type: 'comment',
      ideaId: payload.ideaId,
      message: `New comment on your idea by ${payload.username}`,
      at: new Date().toISOString(),
    });
  }

  @OnEvent('idea.upvoted')
  async handleIdeaUpvotedEvent(payload: { ideaId: number; username: string; userId?: number }) {
    const authorId = await this.getAuthorId(payload.ideaId);
    if (!authorId) return;
    if (payload.userId && payload.userId === authorId) return;
    this.gateway.notifyUser(authorId, 'notification', {
      type: 'upvote',
      ideaId: payload.ideaId,
      message: `${payload.username} liked your idea`,
      at: new Date().toISOString(),
    });
  }

  @OnEvent('idea.downvoted')
  async handleIdeaDownvotedEvent(payload: { ideaId: number; username: string; userId?: number }) {
    const authorId = await this.getAuthorId(payload.ideaId);
    if (!authorId) return;
    if (payload.userId && payload.userId === authorId) return;
    this.gateway.notifyUser(authorId, 'notification', {
      type: 'downvote',
      ideaId: payload.ideaId,
      message: `${payload.username} disliked your idea`,
      at: new Date().toISOString(),
    });
  }

  @OnEvent('idea.shared')
  async handleIdeaSharedEvent(payload: { ideaId: number; username: string; userId?: number }) {
    const authorId = await this.getAuthorId(payload.ideaId);
    if (!authorId) return;
    if (payload.userId && payload.userId === authorId) return;
    this.gateway.notifyUser(authorId, 'notification', {
      type: 'share',
      ideaId: payload.ideaId,
      message: `${payload.username} shared your idea`,
      at: new Date().toISOString(),
    });
  }

  @OnEvent('comment.replied')
  async handleCommentRepliedEvent(payload: { ideaId: number; parentCommentId: number; parentAuthorId: number; username: string; userId: number }) {
    if (!payload?.parentAuthorId) return;
    if (payload.userId === payload.parentAuthorId) return; 
    this.gateway.notifyUser(payload.parentAuthorId, 'notification', {
      type: 'reply',
      ideaId: payload.ideaId,
      parentCommentId: payload.parentCommentId,
      message: `${payload.username} replied to your comment`,
      at: new Date().toISOString(),
    });
  }
}