import { User } from "src/user/entities/user.entity";
import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

export type NotificationType = 'comment' | 'upvote' | 'downvote' | 'share' | 'reply';

@Entity('notification')
@Index(['user','read','createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(()=>User,{nullable: false,onDelete:'CASCADE'})
  user: User;

  @Column({type:'varchar',length:32})
  type: NotificationType;

  @Column({type:'int'})
  ideaId: number;

  @Column({type:'int',nullable:true})
  parentId?: number | null;

  @Column({type:'varchar',length:255})
  message: string;

  @Column({type:'boolean',default:false})
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}


