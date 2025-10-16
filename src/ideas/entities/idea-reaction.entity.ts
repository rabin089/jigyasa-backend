import { User } from "src/user/entities/user.entity";
import { Idea } from "./idea.entity";
import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn, UpdateDateColumn, Unique, Index } from "typeorm";

@Unique(["user", "idea"]) 
@Entity()
export class IdeaReaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @Index()
  user: User;

  @ManyToOne(() => Idea, { onDelete: 'CASCADE' })
  @Index()
  idea: Idea;

  @Column({ type: 'smallint' })
  value: number; // 1 for upvote, -1 for downvote

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
