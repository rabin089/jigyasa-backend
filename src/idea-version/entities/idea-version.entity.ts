import { Idea } from "src/ideas/entities/idea.entity";
import { User } from "src/user/entities/user.entity";
import { Entity, ManyToOne, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class IdeaVersion {
    @PrimaryGeneratedColumn()
    id : number;
    
    @ManyToOne(() => Idea, (idea) => idea.versions, {onDelete: 'CASCADE'})
    idea: Idea;

    @ManyToOne(()=> User, (user)=> user.id, {eager: true})
    user: User;

    @Column()
    title: string;

    @Column()
    description: string;

    @Column({ type: 'int' })
    version: number;

    @Column({ type: 'int', nullable: true })
    parentVersion: number | null;

    @CreateDateColumn()
    createdAt: Date;

}