import { Idea } from "src/ideas/entities/idea.entity";
import { User } from "src/user/entities/user.entity";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert } from "typeorm";
import { randomUUID } from 'crypto';

@Entity()
export class Comment{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text', nullable: false, default: '' })
    content: string;

    
    @Column({ type: 'uuid', unique: true, nullable: true })
    externalId: string | null;

    @ManyToOne(()=> User, (user)=> user.id,{eager: true})
    author: User;

    @ManyToOne(()=> Idea, idea=> idea.comments, {onDelete: 'CASCADE'})
    idea: Idea;

    @ManyToOne(()=> Comment, comment=> comment.children,{nullable: true})
    parent: Comment;

    @OneToMany(()=> Comment, comment=> comment.parent)
    children: Comment[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @BeforeInsert()
    setExternalId() {
        if (!this.externalId) {
            this.externalId = randomUUID();
        }
    }

}